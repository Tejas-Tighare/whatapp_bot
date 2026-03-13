import {
sendMessage,
sendImage,
sendButtons,
sendList
} from "../services/whatsappService.js";

import { config } from "../config/whatsapp.js";
import { DIRECTORY } from "../data/directoryData.js";
import { LANG } from "../data/languageData.js";

const sessions = {};
const processed = new Map();

const MESSAGE_MAX_AGE = 60000;
const DEDUP_TIMEOUT = 3600000;

setInterval(()=>{

const now = Date.now();

for(const [id,time] of processed.entries()){
if(now-time>DEDUP_TIMEOUT){
processed.delete(id);
}
}

},600000);

export const verifyWebhook=(req,res)=>{

const mode=req.query["hub.mode"];
const token=req.query["hub.verify_token"];
const challenge=req.query["hub.challenge"];

if(mode==="subscribe" && token===config.verifyToken){
return res.status(200).send(challenge);
}

return res.sendStatus(403);
};

export const receiveMessage=async(req,res)=>{

try{

const value=req.body?.entry?.[0]?.changes?.[0]?.value;

if(value?.statuses) return res.sendStatus(200);
if(!value?.messages) return res.sendStatus(200);

const msg=value.messages[0];

if(processed.has(msg.id)) return res.sendStatus(200);
processed.set(msg.id,Date.now());

const msgTimestamp=parseInt(msg.timestamp)*1000;

if(Date.now()-msgTimestamp>MESSAGE_MAX_AGE){
return res.sendStatus(200);
}

const user=msg.from;

let payload="";

if(msg.type==="text"){
payload=msg.text.body.toLowerCase();
}

if(msg.type==="interactive"){
payload=
msg.interactive.button_reply?.id ||
msg.interactive.list_reply?.id;
}

if(!sessions[user]){
sessions[user]={step:"START",lang:"english"};
}

const s=sessions[user];

const lang = LANG[s.lang];



/* START */

if(payload==="hi" || payload==="start"){

s.step="LANG";

await sendImage(
user,
"https://whatapp-bot-s5br.onrender.com/poster.jpg",
"Welcome to Citizen Help Bot"
);

return sendButtons(user,lang.selectLanguage,[
{type:"reply",reply:{id:"lang_english",title:"English"}},
{type:"reply",reply:{id:"lang_hindi",title:"हिंदी"}},
{type:"reply",reply:{id:"lang_marathi",title:"मराठी"}}
]);

}



/* LANGUAGE */

if(payload.startsWith("lang_")){

const selectedLang=payload.split("_")[1];

s.lang=selectedLang;

s.step="STATE";

const l=LANG[selectedLang];

return sendButtons(user,l.selectState,[
{type:"reply",reply:{id:"state_mh",title:"Maharashtra"}}
]);

}



/* STATE */

if(payload==="state_mh"){

s.step="CITY";

const l=LANG[s.lang];

return sendList(user,l.selectCity,[{
title:"Cities",
rows:[
{id:"city_amravati",title:"Amravati"},
{id:"city_nagpur",title:"Nagpur"},
{id:"city_akola",title:"Akola"}
]
}]);

}



/* CITY */

if(payload.startsWith("city_")){

const city=payload.split("_")[1];

const l=LANG[s.lang];

if(city!=="amravati"){

await sendMessage(user,l.workingCity);

return sendList(user,l.selectCity,[{
title:"Cities",
rows:[
{id:"city_amravati",title:"Amravati"},
{id:"city_nagpur",title:"Nagpur"},
{id:"city_akola",title:"Akola"}
]
}]);

}

s.step="WARD";

const wards=Object.keys(DIRECTORY["Amravati"]);

const first10=wards.slice(0,10);
const second10=wards.slice(10,20);
const last2=wards.slice(20);

await sendList(user,l.selectWard+" (1-10)",[{
title:"Ward List",
rows:first10.map(w=>({
id:`ward_${w}`,
title:w
}))
}]);

await sendList(user,l.selectWard+" (11-20)",[{
title:"Ward List",
rows:second10.map(w=>({
id:`ward_${w}`,
title:w
}))
}]);

return sendList(user,l.selectWard+" (21-22)",[{
title:"Ward List",
rows:last2.map(w=>({
id:`ward_${w}`,
title:w
}))
}]);

}



/* WARD */

if(payload.startsWith("ward_")){

const ward=payload.replace("ward_","");

const member=DIRECTORY["Amravati"][ward];

const l=LANG[s.lang];

s.step="DEPT";

await sendMessage(user,`Ward Member: ${member}`);

return sendList(user,l.selectDepartment,[{
title:"Departments",
rows:[
{id:"dept_municipal",title:"Municipal Corporation"},
{id:"dept_mseb",title:"MSEB Electricity"},
{id:"dept_health",title:"Health Department"},
{id:"dept_water",title:"Water Supply"},
{id:"dept_waste",title:"Waste Management"}
]
}]);

}



/* DEPARTMENT */

if(payload.startsWith("dept")){

delete sessions[user];

return sendMessage(
user,
"Officer contact will appear here.\n\nType *hi* to restart."
);

}

return sendMessage(user,"Type hi to start.");

}catch(err){

console.error("Webhook Error:",err);

return res.sendStatus(500);

}

};