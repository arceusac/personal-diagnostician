"use strict";

// Variables for chat and stored context specific events
var params = {}; // Object for parameters sent to the Watson Conversation service
var watson = 'Arceus';
var user = '';
var text = '';
var context;
var apimedicUri = "https://authservice.priaid.ch/login";
var apimedicReqUri = "https://healthservice.priaid.ch/";
var password = "R4XsRKymcJjq3muy";
var username = "tejpal_sharma";
var computedHash = CryptoJS.HmacMD5(apimedicUri, password);
var computedHashString = computedHash.toString(CryptoJS.enc.Base64);
var psymptoms;
var arceusURI = 'api/arceus';
var medlabURI = 'api/medlab';
var test = {};

var apiMedicToken = "";

function generateToken() {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', apimedicUri, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + username + ':' + computedHashString);
    xhr.onload = function() {
        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {
            var response = JSON.parse(xhr.responseText);
            apiMedicToken = response.Token;
        } else {
            console.error('Server error for Authorization for APIMedic. Return status of: ', xhr.statusText);
            alert("Unable to get token. Diagnosis won't work.");
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to generate APIMedic token!');
        alert("Unable to get token. Diagnosis won't work.");
    };

    xhr.send();
}

generateToken();

/**
 * @summary Enter Keyboard Event.
 *
 * When a user presses enter in the chat input window it triggers the service interactions.
 *
 * @function newEvent
 * @param {Object} e - Information about the keyboard event.
 */
function newEvent(e) {
    // Only check for a return/enter press - Event 13
    if (e.which === 13 || e.keyCode === 13) {
        var userInput = document.getElementById('chatMessage');
        var messageURI;
        if(userInput) {
            messageURI = arceusURI;
        } else {
            userInput = document.getElementById('medLabChatMessage'); 
            messageURI = medlabURI;
        }
        text = userInput.value; // Using text as a recurring variable through functions
        text = text.replace(/(\r\n|\n|\r)/gm, ""); // Remove erroneous characters

        // If there is any input then check if this is a claim step
        // Some claim steps are handled in newEvent and others are handled in userMessage
        if (text) {

            // Display the user's text in the chat box and null out input box
            displayMessage(text, user);
            userInput.value = '';

            userMessage(text, messageURI);
        } else {

            // Blank user message. Do nothing.
            console.error("No message.");
            userInput.value = '';

            return false;
        }
    }
}

function proposeSymptoms() {
    if(!context.symptoms || context.symptoms == "") {
        alert('No symptoms in context.');
        return false;
    }
    var reqParams = {};
    reqParams.uri = apimedicReqUri+'symptoms/proposed?'; 
    reqParams.symptoms = context.symptoms;
    reqParams.apiMedicToken = apiMedicToken;
    reqParams.lang = 'en-gb';
    reqParams.format = 'json';
    reqParams.gender = 'male';
    reqParams.year_of_birth = context.birthYear ? context.birthYear : 2003;
    
    var xhr = new XMLHttpRequest();
    var uri = '/api/propose';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {
            var response = JSON.parse(xhr.responseText);
            var proposedSymptomsStr = "";
            for(var i=0;i<response.length;i++) {
                if(i==response.length-1) {
                    proposedSymptomsStr += response[i].Name;
                }
                else {
                    proposedSymptomsStr += response[i].Name + ", ";
                }
            }
            if(proposedSymptomsStr != "") {
                context.proposedSymptoms = proposedSymptomsStr;
            }
            userMessage('-', arceusURI);
            //displayMessage(text, watson);
        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
            displayMessage("I ran into an error. Could you please try again.", watson);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
        displayMessage("I can't reach my brain right now. Try again in a few minutes.", watson);
    };
    xhr.send(JSON.stringify(reqParams));
}

function diagnoseCondition() {
    if(!context.symptoms || context.symptoms == "") {
        alert('No symptoms in context.');
        return false;
    }
    var reqParams = {};
    reqParams.uri = apimedicReqUri+'diagnosis?'; 
    reqParams.symptoms = context.symptoms;
    reqParams.apiMedicToken = apiMedicToken;
    reqParams.lang = 'en-gb';
    reqParams.format = 'json';
    reqParams.gender = 'male';
    reqParams.year_of_birth = context.birthYear ? context.birthYear : 2003;
    
    var xhr = new XMLHttpRequest();
    var uri = '/api/diagnose';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {
            var response = JSON.parse(xhr.responseText);
            var diagnosedConditions = "";
            var specialist = "General practice";
            for(var i=0;i<response.length;i++) {
                if(i==0) {
                    if(response[i].Specialisation.length != 0) {
                        specialist = response[i].Specialisation[0].Name;
                    }
                }
                if(i==response.length-1) {
                    diagnosedConditions += response[i].Issue.Name;
                }
                else {
                    diagnosedConditions += response[i].Issue.Name + " or ";
                }
            }
            if(diagnosedConditions != "") {
                context.diagnosedConditions = diagnosedConditions;
            }
            context.specialist = specialist;
            userMessage('-', arceusURI);
            //displayMessage(text, watson);
        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
            displayMessage("I ran into an error. Could you please try again.", watson);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
        displayMessage("I can't reach my brain right now. Try again in a few minutes.", watson);
    };
    xhr.send(JSON.stringify(reqParams));
}

function findDoctor() {
    var specialistRequired = "General practice";
    if(!context.specialist || context.specialist == "") {
        specialistRequired = context.specialist;
    }
    var reqParams = {};
    reqParams.specialistRequired = specialistRequired;
    var userLat = document.getElementById('userLat').value;
    var userLon = document.getElementById('userLon').value;
    reqParams.lon = userLon;
    reqParams.lat = userLat;
    
    var xhr = new XMLHttpRequest();
    var uri = '/api/getDoctor';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {
            var response = JSON.parse(xhr.responseText);
            context.startBooking = true;
            context.doctorName = response.name;
            var newMessage = "We have Dr. " + response.name + " near you, ";
            if(response.gender == 'female') {
                newMessage += "she ";
            } else {
                newMessage += "he ";
            }
            newMessage += "will surely help.";
            displayMessage(newMessage, watson);
            updateMap(response.lat, response.lon, response.name);
            userMessage('-', arceusURI);
        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
            displayMessage("I ran into an error. Could you please try again.", watson);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
        displayMessage("I can't reach my brain right now. Try again in a few minutes.", watson);
    };
    xhr.send(JSON.stringify(reqParams));
}

function describeTest() {
    var testReq = context.test;
    var reqParams = {};
    reqParams.testReq = testReq;
    
    var xhr = new XMLHttpRequest();
    var uri = '/api/getTestDetails';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {
            var response = JSON.parse(xhr.responseText);
            context.testBooked = true;
            context.testDetails = response;
            console.log(response);
            var newMessage = "Please check the details for the test below:<br/>";
            newMessage += "Procedure:<br/>&nbsp;&nbsp;&nbsp;&nbsp;" + response.proc + "<br/>Requirements:<br/>&nbsp;&nbsp;&nbsp;&nbsp;" + response.req + "<br/>Cost:<br/>&nbsp;&nbsp;&nbsp;&nbsp;" + response.cost + " INR";
            displayMessage(newMessage, watson);
            console.log(context)
            userMessage('-', medlabURI);
        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
            displayMessage("I ran into an error. Could you please try again.", watson);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
        displayMessage("I can't reach my brain right now. Try again in a few minutes.", watson);
    };
    xhr.send(JSON.stringify(reqParams));
}

/**
 * @summary Main User Interaction with Service.
 *
 * Primary function for parsing the conversation context  object, updating the list of
 * variables available to Ana, handling when a conversation thread ends and resetting the
 * context, and kicking off log generation.
 *
 * @function userMessage
 * @param {String} message - Input message from user or page load.
 */
function userMessage(message, messageURI) {
    // Set parameters for payload to Watson Conversation
    params.text = message; // User defined text to be sent to service
    params.user_time = new Date();
    if (context) {
        params.context = context;
    }

    var xhr = new XMLHttpRequest();
    var uri = messageURI;
    if(messageURI) {
        uri = messageURI;
    } else {
        uri = arceusURI;
    }

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {

        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            text = response.output.text; // Only display the first response
            context = response.context; // Store the context for next round of questions
            if(context.propose == true) {
                proposeSymptoms();
            }
            if(context.proposedSymptoms) {
                context.proposedSymptoms = "";
            }
            if(context.diagnose == true) {
                diagnoseCondition();
            }
            if(context.findDoctor == true) {
                findDoctor();
            }
            
            if(context.giveDetails == true) {
                context.giveDetails = false;
                describeTest();
            }

            displayMessage(text, watson);

        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
            displayMessage("I ran into an error. Could you please try again.", watson);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
        displayMessage("I can't reach my brain right now. Try again in a few minutes.", watson);
    };

    xhr.send(JSON.stringify(params));
}

function getTimestamp() {
    var d = new Date();
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}
/**
 * @summary Display Chat Bubble.
 *
 * Formats the chat bubble element based on if the message is from the user or from Ana.
 *
 * @function displayMessage
 * @param {String} text - Text to be dispalyed in chat box.
 * @param {String} user - Denotes if the message is from Ana or the user.
 * @return null
 */
function displayMessage(text, user) {
    if(text && text!="") {
        var chat = document.getElementById('chatBox');
        var bubble = document.createElement('div');
        bubble.className = 'message'; // Wrap the text first in a message class for common formatting

        // Set chat bubble color and position based on the user parameter
        if (user === watson) {
          bubble.innerHTML = "<div class='anaTitle'>" + user + " | " + getTimestamp() + "</div><div class='ana'>" + text + "</div>";
        } else {
            var name = "John";
            if(context && context.fname && context.fname.length > 0){
              name = context.fname;
            }
            bubble.innerHTML = "<div class='userTitle'>" + name + " | " + getTimestamp() + "</div><div class='user'>" + text + "</div>";
        }

        chat.appendChild(bubble);
        chat.scrollTop = chat.scrollHeight; // Move chat down to the last message displayed
        if(document.getElementById('medLabChatMessage')) {
            document.getElementById('medLabChatMessage').focus();
        } else {
            document.getElementById('chatMessage').focus();
        }
    }
}

