#!/bin/bash 
pm2 restart /home/app/chatapp/app.js;
pm2 restart /home/app/chatapp/sms.js;
pm2 restart /home/app/chatapp/is_online.js;
pm2 restart /home/app/chatapp/messenger.js;
pm2 restart /home/app/chatapp/whatsapp.js;
