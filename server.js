// before initialize you should set at your terminal
// export GCLOUD_PROJECT='fiap-firebase-c1c4a'

/// ------------- Initialization ------------- 
// EXPRESS
var express = require('express');
var app = express();

// FIREBASE
var admin = require("firebase-admin");
var serviceAccount = require("./firebase-config.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fiap-firebase-c1c4a.firebaseio.com"
});
// MQTT
var mqtt = require('mqtt');  
var mqttClient = mqtt.connect('tcp://iot.eclipse.org:1883');

var lastBPM = '0.0'

/// ------------- MQTT Methods ------------- 
// subscribing on topic 
mqttClient.on('connect', () => {  
    mqttClient.subscribe('nodemcu');
});

// listening mqtt messages
mqttClient.on('message', (topic, message) => {  
    var data = {};
    var shouldPush = false;

    // Message Input
    if (message == "button-panic") {
        console.log('> pressed panic button');
        data = {
            type: "panic"
        };
        shouldPush = true;
    } else {
        lastBPM = message.toString('utf8');
        parsedBPM = parseFloat(lastBPM) / 10.0

        if (parsedBPM > 100.0 || parsedBPM <= 1) {
            // false positive
        } else if (parsedBPM > 80.0) {
            shouldPush = true;
            data = {
                type: "critical-high",
                bpm: parsedBPM.toString()
            }
    
            console.log('> bpm critic :: '+ lastBPM);
        } else if (parsedBPM > 60.0) {
            shouldPush = true;
            data = {
                type: "high",
                bpm: parsedBPM.toString()
            }
    
            console.log('> bpm warning :: '+ lastBPM);
        } else if (parsedBPM < 30.0) {
            shouldPush = true;
            data = {
                type: "critical-low",
                bpm: parsedBPM.toString()
            }
    
            console.log('> bpm critical-low :: '+ lastBPM);
        }
        
    }
    
    // sending push notification
    if (shouldPush) {
        admin.messaging().send({
            data: data,
            topic: 'buddyband'
        })
        .then((response) => {
            console.log('>> push successfully! ', response);
        })
        .catch((error) => {
            console.log('>> error while pushing: ', error);
        });
    }

});

/// ------------- Firebase Methods ------------- 

app.post('/api/panic', function(req, res) {
    message = {
        status: "1"
    };
    res.send(JSON.stringify(message));
    console.log(message);
});

app.get('/api/lastbpm', function(req, res) {
    res.send(lastBPM);
    console.log(`[GET] returning lastBPM :: '${lastBPM}'`);
});

// TODO: Separate topics into custom ones for users

// TODO: implementar histórico de medições (hora em hora)


app.listen(3000, function() {
    console.log('Server is listening');
});