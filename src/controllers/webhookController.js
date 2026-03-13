import { sendMessage, sendImage, sendButtons, sendList } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";
import { DIRECTORY } from "../data/directoryData.js";
import { LANG } from "../data/languageData.js";

const sessions = {};
const processed = new Map();

const MESSAGE_MAX_AGE = 60000;

export const verifyWebhook = (req,res)=>{

const mode=req.query["hub.mode"];
const token=req.query["hub.verify_token"];
const challenge=req.query["hub.challenge"];

if(mode==="subscribe" && token===config.verifyToken){
return res.status(200).send(challenge);
}

return res.sendStatus(403);
};

export const receiveMessage = async(req,res)=>{

try{

const value = req.body?.entry?.[0]?.changes?.[0]?.value;

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
const lang=LANG[s.lang];


/* START */

if(payload==="hi" || payload==="start"){

s.step="LANG";

await sendImage(
user,
"https://whatapp-bot-s5br.onrender.com/poster.jpg",
lang.welcome
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

const l=LANG[selectedLang];

s.step="STATE";

return sendButtons(user,l.selectState,[
{type:"reply",reply:{id:"state_mh",title:"Maharashtra"}}
]);

}


/* STATE */

if(payload==="state_mh"){

const l=LANG[s.lang];

s.step="CITY";

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

s.step="WARD_PAGE_1";

return sendWardPage(user,1,l);

}


/* NEXT BUTTON */

if(payload==="next_ward_2"){
return sendWardPage(user,2,LANG[s.lang]);
}

if(payload==="next_ward_3"){
return sendWardPage(user,3,LANG[s.lang]);
}


/* WARD SELECT */

if(payload.startsWith("ward_")){

const ward=payload.replace("ward_","");
const member=DIRECTORY["Amravati"][ward];

s.step="DEPT";

await sendMessage(user,`Ward Member: ${member}`);

return sendList(user,LANG[s.lang].selectDepartment,[{
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

return sendMessage(user,
`Officer: Rahul Patil
Phone: 9876543210

Type *hi* to restart`
);

}

return sendMessage(user,"Type hi to start");

}catch(err){

console.error(err);
return res.sendStatus(500);

}

};



/* WARD PAGE FUNCTION */

async function sendWardPage(user,page,lang){

const wards=Object.keys(DIRECTORY["Amravati"]);

let list=[];

if(page===1){
list=wards.slice(0,10);
}

if(page===2){
list=wards.slice(10,20);
}

if(page===3){
list=wards.slice(20);
}

await sendList(user,lang.selectWard,[{
title:"Ward List",
rows:list.map(w=>({
id:`ward_${w}`,
title:w
}))
}]);

if(page===1){

return sendButtons(user,"More wards",[
{type:"reply",reply:{id:"next_ward_2",title:"Next"}}
]);

}

if(page===2){

return sendButtons(user,"More wards",[
{type:"reply",reply:{id:"next_ward_3",title:"Next"}}
]);

}

}