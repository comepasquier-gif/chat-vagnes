// 🔹 Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDP-H6X01nM42PGb1Wym7RCaWrsugrL5vA",
  authDomain: "minichat-fc8fc.firebaseapp.com",
  projectId: "minichat-fc8fc",
  storageBucket: "minichat-fc8fc.firebasestorage.app",
  messagingSenderId: "614755534085",
  appId: "1:614755534085:web:3dd7799d11f5991c69236c",
  databaseURL: "https://minichat-fc8fc-default-rtdb.europe-west1.firebasedatabase.app/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 🔹 DOM
const loginBox = document.getElementById("login");
const chatBox = document.getElementById("chat");
const nickEl = document.getElementById("nick");
const codeEl = document.getElementById("code");
const inputMsg = document.getElementById("inputMsg");
const msgEl = document.getElementById("messages");
const suggestionBox = document.getElementById("suggestions");

let loggedIn = false;
let currentUser = "";
let isAdmin = false;
let isSuperAdmin = false;
let currentTeam = null;
let textColor = "#000";

// 🔑 Code secret super admin
const SUPER_CODE = "supercode123";

// 🔹 Liste des commandes
const commands = [
  { cmd: "/nick", role: "user", desc: "Changer de pseudo" },
  { cmd: "/me", role: "user", desc: "Envoyer une action" },
  { cmd: "/time", role: "user", desc: "Afficher l'heure actuelle" },
  { cmd: "/roll", role: "user", desc: "Lancer un dé" },
  { cmd: "/msg", role: "user", desc: "Envoyer un message privé" },
  { cmd: "/team create", role: "user", desc: "Créer une équipe" },
  { cmd: "/team join", role: "user", desc: "Rejoindre une équipe" },
  { cmd: "/colors", role: "user", desc: "Choisir une couleur de texte" },
  { cmd: "/boutique", role: "user", desc: "Changer le fond du chat" },
  { cmd: "/fond", role: "user", desc: "Appliquer un fond" },
  { cmd: "/code adminlesang", role: "user", desc: "Devenir admin" },
  { cmd: "/new user", role: "admin", desc: "Créer un code d'accès" },
  { cmd: "/clear", role: "admin", desc: "Supprimer les messages" },
  { cmd: "/super", role: "user", desc: "Devenir super-admin" },
  { cmd: "/recup", role: "super", desc: "Sauvegarder et vider la base" },
  { cmd: "/reset", role: "super", desc: "Réinitialiser complètement la base" },
  { cmd: "/broadcast", role: "super", desc: "Envoyer un message global" }
];

// 🔹 Connexion
function login(){
  const nick = nickEl.value.trim();
  const code = codeEl.value.trim();
  if(!nick || !code) return alert("Pseudo + code requis !");

  db.ref("codes/"+code).once("value").then(snap=>{
    if(snap.exists()){
      loggedIn = true;
      currentUser = nick;
      loginBox.style.display="none";
      chatBox.style.display="flex";
      listenMessages();
      systemMessage("✅ Connecté en tant que "+nick);
    } else {
      alert("❌ Code invalide !");
    }
  });
}

// 🔹 Auto-complétion
inputMsg.addEventListener("input", ()=>{
  const val = inputMsg.value.trim();
  if(val.startsWith("/")){
    const matches = commands.filter(c=>{
      if(c.role==="admin" && !isAdmin && !isSuperAdmin) return false;
      if(c.role==="super" && !isSuperAdmin) return false;
      return c.cmd.startsWith(val);
    });
    if(matches.length>0){
      suggestionBox.innerHTML="";
      matches.forEach(c=>{
        const div=document.createElement("div");
        div.textContent=c.cmd+" → "+c.desc;
        div.onclick=()=>{
          inputMsg.value=c.cmd;
          suggestionBox.style.display="none";
        };
        suggestionBox.appendChild(div);
      });
      suggestionBox.style.display="block";
    } else suggestionBox.style.display="none";
  } else suggestionBox.style.display="none";
});

// 🔹 Envoyer un message ou exécuter commande
function sendMessage(){
  if(!loggedIn) return;
  const text = inputMsg.value.trim();
  if(!text) return;

  // --- Commandes ---
  if(text.startsWith("/nick ")){ currentUser=text.split(" ")[1]; systemMessage("✏️ Nouveau pseudo: "+currentUser); inputMsg.value=""; return; }
  if(text.startsWith("/me ")){ db.ref("messages").push({nick:"*"+currentUser+"*", text:text.substring(4), t:Date.now()}); inputMsg.value=""; return; }
  if(text==="/time"){ systemMessage("⏰ "+new Date().toLocaleTimeString()); inputMsg.value=""; return; }
  if(text==="/roll"){ systemMessage("🎲 Dé : "+(Math.floor(Math.random()*6)+1)); inputMsg.value=""; return; }
  if(text.startsWith("/msg ")){ const parts=text.split(" "); const target=parts[1]; const pm=parts.slice(2).join(" "); db.ref("messages").push({nick:currentUser+" → "+target, text:"[Privé] "+pm, t:Date.now()}); inputMsg.value=""; return; }
  if(text.startsWith("/team create ")){ currentTeam=text.split(" ")[2]; systemMessage("👥 Équipe créée : "+currentTeam); inputMsg.value=""; return; }
  if(text.startsWith("/team join ")){ currentTeam=text.split(" ")[2]; systemMessage("👥 Rejoint l'équipe : "+currentTeam); inputMsg.value=""; return; }
  if(text==="/colors"){ const color=prompt("Couleur CSS (#hex ou nom):","#0000ff"); if(color){ textColor=color; systemMessage("🎨 Couleur : "+color); } inputMsg.value=""; return; }
  if(text==="/boutique"){ systemMessage("🖼️ Fonds: clair, sombre, nature, city (/fond <nom>)"); inputMsg.value=""; return; }
  if(text.startsWith("/fond ")){ const fond=text.split(" ")[1]; document.body.style.background=fond==="sombre"?"#222":fond==="clair"?"#ece5dd":fond==="nature"?"url('https://source.unsplash.com/1600x900/?nature')":"url('https://source.unsplash.com/1600x900/?city')"; systemMessage("🖼️ Fond appliqué : "+fond); inputMsg.value=""; return; }

  if(text==="/code adminlesang"){ isAdmin=true; systemMessage("✅ ADMIN activé"); inputMsg.value=""; return; }
  if(text.startsWith("/new user ")){ if(isAdmin||isSuperAdmin){ const newCode=text.split(" ")[2]; db.ref("codes/"+newCode).set(true); systemMessage("🔑 Nouveau code: "+newCode); } inputMsg.value=""; return; }
  if(text==="/clear"){ if(isAdmin||isSuperAdmin){ db.ref("messages").remove(); msgEl.innerHTML=""; systemMessage("🧹 Chat nettoyé"); } inputMsg.value=""; return; }
  if(text.startsWith("/super ")){ if(text.split(" ")[1]===SUPER_CODE){ isSuperAdmin=true; isAdmin=true; systemMessage("👑 SUPER ADMIN activé"); } else systemMessage("⛔ Code incorrect"); inputMsg.value=""; return; }
  if(text==="/recup"){ if(isSuperAdmin){ db.ref("messages").once("value").then(snap=>{ const dataStr="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(snap.val())); const dl=document.createElement("a"); dl.setAttribute("href",dataStr); dl.setAttribute("download","backup_chat.json"); dl.click(); db.ref("messages").remove(); msgEl.innerHTML=""; systemMessage("📥 Sauvegarde + reset"); }); } inputMsg.value=""; return; }
  if(text==="/reset"){ if(isSuperAdmin){ db.ref("messages").remove(); msgEl.innerHTML=""; systemMessage("⚡ Reset complet"); } inputMsg.value=""; return; }
  if(text.startsWith("/broadcast ")){ if(isSuperAdmin){ db.ref("messages").push({nick:"[BROADCAST]", text:text.substring(11), t:Date.now()}); } inputMsg.value=""; return; }

  // --- Message normal ---
  db.ref("messages").push({nick:currentUser, text:text, color:textColor, team:currentTeam, t:Date.now()});
  inputMsg.value="";
}

// 🔹 Ecoute des messages
function listenMessages(){
  db.ref("messages").on("child_added", snap=>{
    const m=snap.val();
    if(m.team && currentTeam && m.team!==currentTeam) return;
    let d=document.createElement("div");
    d.className="msg "+(m.nick===currentUser?"mine":"other");
    d.style.color=m.color||"#000";
    d.innerText=m.nick+": "+m.text;
    msgEl.appendChild(d);
    msgEl.scrollTop=msgEl.scrollHeight;
  });
}

// 🔹 Messages système
function systemMessage(txt){
  let d=document.createElement("div");
  d.className="msg system";
  d.innerText=txt;
  msgEl.appendChild(d);
  msgEl.scrollTop=msgEl.scrollHeight;
}
