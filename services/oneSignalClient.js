const OneSignal = require('onesignal-node');

const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 'cd687278-406c-460c-8092-02948324192f';
const apiKey = process.env.ONESIGNAL_REST_API_KEY || 'os_v2_app_zvuhe6canrdazaesakkigjazf6uspsy23vauwr4pit7mlou2zviqx7m4prgybhjzueqrip65ms4caz6dz3ui7lpmhp4dyorpwwfoz5qcd687278-406c-460c-8092-02948324192f';

const client = new OneSignal.Client(appId, apiKey);

module.exports = client;
