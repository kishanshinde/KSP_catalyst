'use strict';

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

app.get('/', async (req, res) => {
    try {

        const catalystApp = catalyst.initialize(req);

        const userManagement = catalystApp.userManagement();

        const currentUser = await userManagement.getCurrentUser();

        return res.status(200).json({
            success: true,
            user: {
                user_id: currentUser.user_id,
                zuid: currentUser.zuid,
                first_name: currentUser.first_name,
                last_name: currentUser.last_name,
                email: currentUser.email_id,
                role: currentUser.role_details?.role_name,
                role_id: currentUser.role_details?.role_id,
                status: currentUser.status,
                confirmed: currentUser.is_confirmed
            }
        });

    } catch (err) {

        console.error(err);

        return res.status(401).json({
    		success: false,
    		code: "AUTH_REQUIRED",
   			message: "Authentication required. Please sign in."
		});

    }
});

module.exports = app;