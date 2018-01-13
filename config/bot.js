/**
 * This file contains all of the web and hybrid functions for interacting with
 * Arceus and the Watson Conversation service. When API calls are not needed, the
 * functions also do basic messaging between the client and the server.
 *
 * @summary   Functions for Arceus Chat Bot.
 *
 * @link      cloudco.mybluemix.net
 * @since     0.0.3
 * @requires  app.js
 *
 */
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');
var chrono = require('chrono-node');
var fs = require('fs');

// load local VCAP configuration
var vcapLocal = null;
var appEnv = null;
var appEnvOpts = {};

var conversationWorkspace, conversation, conversationWorkspaceMedlab;

fs.stat('./vcap-local.json', function(err, stat) {
    if (err && err.code === 'ENOENT') {
        // file does not exist
        initializeAppEnv();
    } else if (err) {
    } else {
        vcapLocal = require("../vcap-local.json");
        appEnvOpts = {
            vcap: vcapLocal
        };
        initializeAppEnv();
    }
});

// get the app environment from Cloud Foundry, defaulting to local VCAP
function initializeAppEnv() {
    appEnv = cfenv.getAppEnv(appEnvOpts);

    if (appEnv.isLocal) {
        require('dotenv').load();
    }
    if (appEnv.services.conversation) {
        initConversation();
    } else {
        console.error("No Watson conversation service exists");
    }
}

// =====================================
// CREATE THE SERVICE WRAPPER ==========
// =====================================
// Create the service wrapper
function initConversation() {
    var conversationCredentials = appEnv.getServiceCreds("diagnostician-bot-conversation");
    var conversationUsername = process.env.CONVERSATION_USERNAME || conversationCredentials.username;
    var conversationPassword = process.env.CONVERSATION_PASSWORD || conversationCredentials.password;
    var conversationURL = process.env.CONVERSATION_URL || conversationCredentials.url;

    conversation = watson.conversation({
        url: conversationURL,
        username: conversationUsername,
        password: conversationPassword,
        version_date: '2016-07-11',
        version: 'v1'
    });

    // check if the workspace ID is specified in the environment
    conversationWorkspace = process.env.ARCEUS_WORKSPACE;
    conversationWorkspaceMedlab = process.env.MEDLAB_WORKSPACE;
}

// =====================================
// REQUEST FOR Arceus =====================
// =====================================
// Allow clients to interact with Arceus
var chatbot = {
    sendMessage: function(req, workspaceArceus, callback) {
        var owner = req.user.email;
        console.log(req.body.context);
        buildContextObject(req, workspaceArceus, function(err, params) {
            if (err) {
                return callback(err);
            }

            if (params.message) {
                var conv = req.body.context.conversation_id;
                var context = req.body.context;

                var res = {
                    intents: [],
                    entities: [],
                    input: req.body.text,
                    output: {
                        text: params.message
                    },
                    context: context
                };

            } else if (params) {
                // Send message to the conversation service with the current context
                conversation.message(params, function(err, data) {
                    if (err) {
                        return callback(err);
                    }
                    var conv = data.context.conversation_id;
                    console.log('Arceus response ');
                    console.log(data);

                    updateContextObject(data, function(err, res) {
                        return callback(null, res);
                    });
                });
            }

        });
    }
};

// ===============================================
// UTILITY FUNCTIONS FOR CHATBOT AND LOGS ========
// ===============================================
/**
 * @summary Form the parameter object to be sent to the service
 *
 * Update the context object based on the user state in the conversation and
 * the existence of variables.
 *
 * @function buildContextObject
 * @param {Object} req - Req by user sent in POST with session and user message
 */
function buildContextObject(req, workspaceArceus ,callback) {
    var message = req.body.text;
    var userTime = req.body.user_time;
    var context;

    if (!message) {
        message = '';
    }

    // Null out the parameter object to start building
    var params = {
        workspace_id: conversationWorkspace,
        input: {},
        context: {}
    };
    if(!workspaceArceus) {
        params.workspace_id = conversationWorkspaceMedlab;
    }
    var reprompt = {
        message: '',
    };
    if (req.body.context) {
        context = req.body.context;
        params.context = context;
        //Handle case when we feed on context.
        //Or send a message from middleware instead of watson.
    } else {
        context = '';
    }

    // Set parameters for payload to Watson Conversation
    params.input = {
        text: message // User defined text to be sent to service
    };

    // This is the first message, add the user's name and get their healthcare object
    if ((!message || message === '') && !context) {
        params.context = {
            fname: req.user.fname,
            lname: req.user.lname,
            birthYear: req.user.birthYear
        };
    }

    return callback(null, params);
}

/**
 * @summary Update the response object with parsed details
 *
 * Update the response object when Arceus assigns a chosen variables or
 * when updating the text to display detailed policy information.
 *
 * @function updateContextObject
 * @param {Object} response - JSON response from the conversation service
 */
function updateContextObject(response, callback) {
    var context = response.context; // Store the context for next round of questions

    var services = context.services;
    var procedures = context.procedures;
    var procedure = '';
    var detail = '';
    var procedure_details = {};
    var text = '';

    text = response.output.text[0]; // Only display the first response
    response.output.text = '';

    response.output.text = text;
    response.context = context;

    return callback(null, response);
}

module.exports = chatbot;
