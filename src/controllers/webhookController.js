import { sendMessage, sendImage, sendButtons, sendList } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";
import { DIRECTORY } from "../data/directoryData.js";
import { LANG } from "../data/languageData.js";

const sessions = {};
const processed = new Map();

const MESSAGE_MAX_AGE = 60000;


/* VERIFY WEBHOOK */

export const verifyWebhook = (req,res)=>{

const mode=req.query["hub.mode"];
const token=req.query["hub.verify_token"];
const challenge=req.query["hub.challenge"];

if(mode==="subscribe" && token===config.verifyToken){
return res.status(200).send(challenge);
}

return res.sendStatus(403);

};



/* RECEIVE MESSAGE */

export const receiveMessage = async(req,res)=>{

try{

const value=req.body?.entry?.[0]?.changes?.[0]?.value;

if(value?.statuses) return res.sendStatus(200);
if(!value?.messages) return res.sendStatus(200);

const msg=value.messages[0];

/* prevent duplicate processing */

if(processed.has(msg.id)) return res.sendStatus(200);
processed.set(msg.id,Date.now());

/* ignore old retries */

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


/* SESSION */

if(!sessions[user]){
sessions[user]={step:"START",lang:"english"};
}

const s=sessions[user];
const lang=LANG[s.lang];


/* START */

if(payload==="hi" || payload==="start"){

s.step="LANG";

/* SEND POSTER FIRST */

await sendImage(
user,
"https://whatapp-bot-s5br.onrender.com/poster.jpg",
lang.welcome
);

/* WAIT 1.5 SECONDS */

await new Promise(resolve=>setTimeout(resolve,1500));

/* SEND LANGUAGE OPTIONS */

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

return sendWardPage(user,1,l);

}



/* PAGINATION */

if(payload==="next_ward_2"){
return sendWardPage(user,2,LANG[s.lang]);
}

if(payload==="next_ward_3"){
return sendWardPage(user,3,LANG[s.lang]);
}



/* WARD SELECT */

if(payload.startsWith("ward_")){

const ward=payload.replace("ward_","");

const wardData=DIRECTORY["Amravati"][ward];

/* BUILD MEMBER LIST */

let memberText="👥 Ward Members\n\n";

Object.entries(wardData).forEach(([key,value])=>{
memberText+=`${key} – ${value}\n`;
});

/* SEND MEMBERS */

await sendMessage(user,memberText);

/* SHOW DEPARTMENTS */

return sendList(user,LANG[s.lang].selectDepartment,[{
title:"Departments",
rows:[
{id:"dept_municipal",title:"Municipal"},
{id:"dept_mseb",title:"MSEB"},
{id:"dept_health",title:"Health"},
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
`👤 Officer: Rahul Patil
📞 Call: +91 9876543210

Tap the number to call.

Type *hi* to restart`
);

}

return sendMessage(user,"Type hi to start");

}catch(err){

console.error("Webhook Error:",err);
return res.sendStatus(500);

}

};



/* WARD PAGE FUNCTION */

async function sendWardPage(user,page,lang){

const wards=Object.keys(DIRECTORY["Amravati"]);

let list=[];

if(page===1){
list=wards.slice(0,9);
list.push("NEXT_PAGE_2");
}

if(page===2){
list=wards.slice(9,18);
list.push("NEXT_PAGE_3");
}

if(page===3){
list=wards.slice(18);
}

const rows=list.map(w=>{

if(w==="NEXT_PAGE_2"){
return{
id:"next_ward_2",
title:"Next",
description:"More wards"
};
}

if(w==="NEXT_PAGE_3"){
return{
id:"next_ward_3",
title:"Next",
description:"More wards"
};
}

/* shorten ward name automatically */

let shortTitle=w;

if(shortTitle.includes("–")){
shortTitle=shortTitle.split("–")[0].trim();
}

if(shortTitle.length>24){
shortTitle=shortTitle.substring(0,22);
}

return{
id:`ward_${w}`,
title:shortTitle,
description:w
};

});

return sendList(user,lang.selectWard,[{
title:"Ward List",
rows
}]);

}