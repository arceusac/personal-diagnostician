# personal-diagnostician
Meet Arceus - your personal diagnostician.

This web application is made in node js using express.
Uses IBM watson for chat and apiMedic's apis to diagnose user's condition/disease.
Project is inspired from IBM's original bot Ana.

Read watson documentation to get started
	https://console.bluemix.net/docs/services/conversation/getting-started.html

Configuration is needed in following files:
	your workspace ids in .env file
	Your conversation API credentials in vcap-local.json
	Your db configuration in ./lib/dbconn.js

To run application you need to need to install node and execute "npm install" in root folder.
Execute "npm start" to start web application.
Application will be accessible on http://localhost:3000


Integration with botkit is coming soon...