const Discord = require("discord.js");
const Jimp = require('jimp');
const fs = require('fs');
const { exit } = require("process");


let client = new Discord.Client();

// init
const jimps = [];
const images = ["BERGSCHLOSS", "FABRIK", "FAVELAS", "GEFÄNGNIS", "IKARUS", "KANÄLE", "SKYFELL", "VICE", "WINDSEITE", "GLETSCHER"];
const emojis = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿'];
const SIZEX = 115 * 2;
const SIZEY = 65 * 2;
const reactionToken = '/';

let fullImage;
let allowedChannels = [];
let sessions = {};


function resetImages(channelId) {
    sessions[channelId].imgsInUse = images.slice();
}

function removeIndexByName(mapName, channelId) {
    const index = sessions[channelId].imgsInUse.indexOf(mapName);
    if(index > -1) {
        sessions[channelId].imgsInUse.splice(index, 1);
    }
}

function removeIndexById(mapId, channelId) {
    if(mapId > -1) {
        sessions[channelId].imgsInUse.splice(mapId, 1);
    }
}

function getEmojiId(emoji) {
    return emojis.indexOf(emoji);
}

async function init() {


    // load Channels from Text File
    fs.readFile('channels.txt', 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }
        allowedChannels = data.replace(/\s+/g, '').split(',');
        

        for(let i = 0; i < allowedChannels.length; i++) {
            sessions[allowedChannels[i]] = {};
            sessions[allowedChannels[i]].machingInProgress = false;
            sessions[allowedChannels[i]].isProcessing = false;
            sessions[allowedChannels[i]].player1id = ""; 
            sessions[allowedChannels[i]].player2id = ""; 
            sessions[allowedChannels[i]].lastPostedMessage = "";
            sessions[allowedChannels[i]].imgsInUse = [];
            resetImages(allowedChannels[i]);
        }
    
        console.log("Sessions: ");
        console.log(sessions);
        console.log();
        console.log("Used Images: ");
        console.log(images);
        console.log();
        console.log("Allowed Channels: ");
        console.log(allowedChannels);
        console.log();

    });

    

    for (let i = 0; i < images.length; i++) {
        jimps.push(Jimp.read("maps/" + images[i] + ".png"));
    }
    


}
init();

async function postImages(message, channelId) { 
    sessions[channelId].isProcessing = true;
    let currentJimps = [];
    
    for(let i = 0; i < images.length; i++) {
        if(sessions[channelId].imgsInUse.includes(images[i])) {
            currentJimps.push(jimps[i]);
        }
    }
    

    await Promise.all(currentJimps).then(function(data) {
    return Promise.all(currentJimps);
    }).then(async function(data) {

        let scaleX = currentJimps.length * SIZEX;
        const scaleY = Math.floor(((currentJimps.length - 1) / 3) + 1) * SIZEY;
    
        if (currentJimps.length > 3) {
            scaleX = SIZEX * 3;
        }

        fullImage = new Jimp(scaleX, scaleY, "black", (err, image) => {
            if (err) throw err;
        });

        for(let i = 0; i < data.length; i++) {
            data[i].resize(SIZEX, SIZEY);
        }


        for(let i = 0; i < data.length; i++) {

            fullImage.composite(data[i], SIZEX * (i % 3), SIZEY * (Math.floor(i / 3)));
        }

        fullImage.write("temp/" + channelId + ".png");

        console.log("Image sended in " + channelId);
    }).then (function() {

        let msg = "Die Map " + sessions[channelId].imgsInUse[0] + " wurde gewäht";
        if(sessions[channelId].imgsInUse.length > 1) {
            msg = "Welche Map soll entfernt werden?";
        }
         
        message.channel.send(msg, {
            files: [
                "./temp/" + channelId + ".png",
            ],
        }).then(function(replyMsg) {

            sessions[channelId].lastPostedMessage = replyMsg.id;

            if(sessions[channelId].imgsInUse.length > 1) {
                for(let i = 0; i < sessions[channelId].imgsInUse.length; i++) {
                    replyMsg.react(emojis[i]);
                }
            }
            else{
                sessions[channelId].machingInProgress = false;
                resetImages(channelId);
            }

            sessions[channelId].isProcessing = false;
        });
    });
}


client.once("ready", () => {
    client.user.setActivity(reactionToken + "start um zu beginnen", { type: "" });
    console.log("Bot Ready!");
});

client.on("message", message => {
    const channelId = message.channel.id;
    if (allowedChannels.includes(channelId)) {
        console.log("Message: " + message.content);
        if (sessions[channelId].isProcessing === false) {

            if (message.content.substr(0, 6).toLowerCase() == reactionToken + "start" && sessions[channelId].machingInProgress == false) {
                
                if (message.mentions.members.first() == undefined) {
                    message.channel.send("Du must jemand erwähnen um dies zu machen!");
                    return;
                }
            
                sessions[channelId].player1id = message.author.id;
                sessions[channelId].player2id = message.mentions.members.first().user.id;

                console.log("Matching started by " + message.author.tag + " and " + message.mentions.members.first().user.tag);

                sessions[channelId].machingInProgress = true;
                postImages(message, channelId); 
            }


            if (message.content.toLowerCase() == reactionToken + "abbrechen" && allowedChannels.includes(message.channel.id)) {

                if (sessions[channelId].machingInProgress) {
                    message.channel.send("Matching wurde abgebrochen!");
                    console.log("aborted " + channelId);
                }

                sessions[channelId].machingInProgress = false;
                sessions[channelId].lastPostedMessage = "";
                resetImages(channelId);
                sessions[channelId].player1id = "";
                sessions[channelId].player2id = "";
            }
        }
    }
});


client.on("messageReactionAdd", (reaction, user) => { 
    if(user.bot) return;
    if(reaction.message.author.id === client.user.id) {

        const index = getEmojiId(reaction.emoji.name); 
        const channelId = reaction.message.channel.id;
        console.log(user.tag + " removed " + index);

        if (user.id == sessions[channelId].player2id || user.id == sessions[channelId].player1id) {
            if (reaction.message.id == sessions[channelId].lastPostedMessage && index >= 0 && index < sessions[channelId].imgsInUse.length) {
                removeIndexById(index, channelId);
                postImages(reaction.message, channelId);            
            }
        }
        else{
            console.log("remove reaction from " + user.tag);
            reaction.users.remove(user.id);
        }

        
    }
});

client.login("Nzc3NjY2ODU3NDg1NTk4NzIx.X7Gwsw.3OVljCG2cDU5akllZV3KynTIkKM");