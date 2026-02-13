// ================= WARD BUILDER =================

function buildWard(member) {
  return {
    member,
    services: {
      road: [{ name: "Road Officer", phone: "9000000001" }],
      water: [{ name: "Water Officer", phone: "9000000002" }],
      electricity: [{ name: "Electrician", phone: "9000000003" }]
    }
  };
}

// ================= MEMBER DATA =================

const MEMBERS = {
  "Shegaon – Rahatgaon": {
    A: "कल्याणी डांके",
    B: "चंद्रकांत खेड़कर",
    C: "वंदना मडये",
    D: "प्रशांत धर्मळे"
  },

  "Sant Gadgebaba – P.D.M.C.": {
    A: "विनोद तानवे",
    B: "मीना सराई",
    C: "सुरेखा डुंगरे",
    D: "प्रमोद महल्ले"
  },

  "Navsari – Hardik Colony": {
    A: "अनीता काळे",
    B: "प्रशांत महल्ले",
    C: "लुबना तबीवर से. मरकूम",
    D: "श्रेफिको देशमुख"
  },

  "Jamil Colony – Lalkhadi": {
    A: "अहमद शा. इकबाल शा",
    B: "फरद ताज स. मीर अली",
    C: "कुबर बानो कासम अली",
    D: "सलाउद्दीन इकरामुद्दीन"
  },

  "Mahendra Colony – New Cotton Market": {
    A: "सुनीता लोणारे",
    B: "माधुरी ठाकरे",
    C: "राजश्री जठळे",
    D: "धीरज हिवसे"
  },

  "Vilas Nagar – Morbag – Gawalipura": {
    A: "संजय नरवणे",
    B: "पूजा अग्रवाल",
    C: "दीपक साहू",
    D: "रेखा तावडे"
  },

  "Jawahar Stadium – Bhim Nagar": {
    A: "सोनाली नाईक",
    B: "मनीष बजाज",
    C: "स्नेहा तुल्ला",
    D: "श्रीचंद तेजवानी"
  },

  "Jog Stadium – Chaparashipura": {
    A: "माला गवई",
    B: "अर्चना आगाम",
    C: "असमा खान फिरोज खान",
    D: "बाबू रोहिदास"
  },

  "S.R.P.F. – Wadali – Amravati University": {
    A: "विशाल वानखेडे",
    B: "पुष्पा गुहे",
    C: "पंचफुला पंधाणा"
  },

  "Benoda – Bhimtekadi – Dastur Nagar": {
    A: "मधुरा काहळे",
    B: "अर्चना पाटील",
    C: "मंगेश मनोरे",
    D: "अविनाश माईंडकर"
  },

  "Frezarpura – Rukhmini Nagar": {
    A: "विद्या माटे",
    B: "इस्माईल लखुदेव",
    C: "नूतन भुजाडे",
    D: "सचिन वैध"
  },

  "Swami Vivekanand Colony – Belpura": {
    A: "राधा कुरले",
    B: "प्रीती रेणे",
    C: "सिमता सूर्यवंशी",
    D: "प्रदीप हिवसे"
  },

  "Ambapeth – Gaurakshan – Namuna": {
    A: "मिलिंद बाम्बळ",
    B: "लविना हर्षे",
    C: "स्वाती कुलकर्णी",
    D: "रतन ढेंडे"
  },

  "Jawahar Gate – Budhwara": {
    A: "विलास इंगोले",
    B: "सुनीता भेले",
    C: "ललिता राठवा",
    D: "संजय शिरसाटे"
  },

  "Chhaya Nagar – Pathanpura": {
    A: "शाह अफसर शाह",
    B: "से. राशद अली से. शौकत अली",
    C: "खान आसिया अंजुम वहीद",
    D: "Member Pending"
  },

  "Alim Nagar – Rehmat Nagar": {
    A: "मरियम बानो शाह इस्माईल",
    B: "मरियम बानो शाह इस्माईल",
    C: "मो. रेहान मो. यासिन",
    D: "रो. हमीद रो. वाहेद"
  },

  "Gadgadeshwar – Ravi Nagar": {
    A: "आशिष अवतके",
    B: "योगेश विजयकर",
    C: "प्रियंका पाटणे",
    D: "अर्चना पांडे"
  },

  "Rajapeth – Shri Sant Kanwarram": {
    A: "नंदा सावदे",
    B: "प्रशांत वानखेडे",
    C: "पजवा कोठड्य",
    D: "महेश मुळचंदानी"
  },

  "Sai Nagar – Akoli": {
    A: "चेतन गावंडे",
    B: "मंजुषा जाधव",
    C: "लता देशमुख",
    D: "सचिन भेंडे"
  },

  "Sutgirni – Samara Nagar": {
    A: "संजय गव्हाळे",
    B: "सुमती ठोके",
    C: "शारदा खोड़े",
    D: "राजेंद्र तापडे"
  },

  "Juni Wasti – Badnera": {
    A: "मीरा कांबळे",
    B: "Member Pending",
    C: "नजीब खान करीम खान",
    D: "नाना आम्ले"
  },

  "Navi Wasti – Badnera": {
    A: "रजनी डोंगरे",
    B: "अजय जयस्वाल",
    C: "गौरी मेघवाणी",
    D: "किशोर जाधव"
  }
};

// ================= FINAL DIRECTORY =================

export const DIRECTORY = {
  Amravati: Object.fromEntries(
    Object.entries(MEMBERS).map(([prabhag, wards]) => [
      prabhag,
      Object.fromEntries(
        Object.entries(wards).map(([ward, member]) => [
          ward,
          buildWard(member)
        ])
      )
    ])
  )
};
