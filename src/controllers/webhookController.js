import { sendMessage, sendImage, sendButtons, sendList } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";
import { DIRECTORY } from "../data/directoryData.js";

const sessions = {};
const processed = new Map();

const MESSAGE_MAX_AGE = 60000;
const DEDUP_TIMEOUT = 3600000;

setInterval(()=>{

const now = Date.now();

for(const [id,time] of processed.entries()){

if(now - time > DEDUP_TIMEOUT){
processed.delete(id);
}

}

},600000);

export const verifyWebhook = (req,res)=>{

const mode = req.query["hub.mode"];
const token = req.query["hub.verify_token"];
const challenge = req.query["hub.challenge"];

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

const msg = value.messages[0];

if(processed.has(msg.id)) return res.sendStatus(200);

processed.set(msg.id,Date.now());

const msgTimestamp = parseInt(msg.timestamp)*1000;

if(Date.now()-msgTimestamp>MESSAGE_MAX_AGE){
return res.sendStatus(200);
}

const user = msg.from;

let payload="";

if(msg.type==="text"){
payload = msg.text.body.toLowerCase();
}

if(msg.type==="interactive"){
payload = msg.interactive.button_reply?.id || msg.interactive.list_reply?.id;
}

if(!sessions[user]){
sessions[user]={step:"START"};
}

const s=sessions[user];

if(payload==="hi" || payload==="start"){

s.step="LANG";

await sendImage(user,
"https://whatapp-bot-s5br.onrender.com/poster.jpg",
"Welcome to Citizen Help Bot"
);

return sendButtons(user,"Select Language",[
{type:"reply",reply:{id:"lang_en",title:"English"}},
{type:"reply",reply:{id:"lang_hi",title:"हिंदी"}},
{type:"reply",reply:{id:"lang_mr",title:"मराठी"}}
]);

}

if(payload.startsWith("lang")){

s.step="STATE";

return sendButtons(user,"Select State",[
{type:"reply",reply:{id:"state_mh",title:"Maharashtra"}}
]);

}

if(payload==="state_mh"){

s.step="CITY";

return sendList(user,"Select City",[{
title:"Cities",
rows:[
{id:"city_amravati",title:"Amravati"},
{id:"city_nagpur",title:"Nagpur"},
{id:"city_akola",title:"Akola"}
]
}]);

}

if(payload.startsWith("city")){

const city = payload.split("_")[1];

if(city!=="amravati"){

delete sessions[user];

return sendMessage(user,"We are currently working on this city.\nPlease select *Amravati* for now.");

}

s.step="WARD";

const wards = Object.keys(DIRECTORY["Amravati"]);

const rows = wards.map(w=>({id:`ward_${w}`,title:w}));

return sendList(user,"Select Ward",[
{title:"Ward 1-10",rows:rows.slice(0,10)},
{title:"Ward 11-20",rows:rows.slice(10,20)},
{title:"Ward 21-22",rows:rows.slice(20)}
]);

}

if(payload.startsWith("ward")){

const ward = payload.replace("ward_","");

const member = DIRECTORY["Amravati"][ward];

s.step="DEPT";

await sendMessage(user,`Ward Member: ${member}`);

return sendList(user,"Select Department",[{
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

if(payload.startsWith("dept")){

delete sessions[user];

return sendMessage(user,"Officer contact will appear here.\nType *hi* to restart.");

}

return sendMessage(user,"Type *hi* to start.");

}catch(err){

console.error("Webhook Error:",err);

return res.sendStatus(500);

}

};