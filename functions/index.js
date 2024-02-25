const admin = require('firebase-admin');

require('firebase/database');
const cors = require('cors');
const express = require('express');

const { onRequest } = require("firebase-functions/v2/https");


const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://calculatorcloudfunctions-default-rtdb.firebaseio.com"
});

const database = admin.database();
const usersRef = database.ref('users');

const app = express()

app.use(cors({
    origin: true,
    methods: '*',
    allowedHeaders: '*'
}));

// Handle preflight requests
app.options('*', cors());



exports.calculate = onRequest(async (request, response) => {
    const { num1, num2, operation, symbol, userId } = request.body

    let result;
    // decide which operation to use depend on user selection on frontend
    switch (operation) {
        case '+':
            result = Number(num1) + Number(num2);
            break;
        case '-':
            result = Number(num1) - Number(num2);
            break;
        case '*':
            result = Number(num1) * Number(num2);
            break;
        case '/':
            result = Number(num1) / Number(num2);
            break;
        default:
            result = '';
    }

    // Save calculation to user's document
    try {

        const userRef = usersRef.child(userId);

        await userRef.child('history').push(`${num1} ${operation} ${num2} = ${symbol}${result.toFixed(2)}`)

        return response.status(200).json({
            message: "success",
            result: result.toFixed(2)
        })
    } catch (error) {
        console.log("error", error);
    }

});

/**
 * get history of user calculation from firebase
 */
exports.history = onRequest(async (request, response) => {
    const { userId } = request.body;

    if (!userId) {
        return response.status(400).json({
            error: "userId parameter is required"
        });
    }

    try {

        const userRef = usersRef.child(userId);
        const snapshot = await userRef.child('history').once('value');
        const history = snapshot.val() || [];

        return response.status(200).json({
            history
        });
    } catch (error) {
        return response.status(500).json({
            error: "Internal server error"
        });
    }
});
