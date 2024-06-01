import http from 'k6/http';
import { Utils } from '../generators/generators.js';

export default class CreateUser {
    constructor() {
    }

    generateUser() {
        this.email = Utils.generateEmail();
        this.phoneNumber = "+79" + Utils.generateRandomNumber(9);
    }

    setup() {
        this.generateUser();
        let isRegistered = false;
        let login;

        while (!isRegistered) {
            const mutation = `mutation OneClickRegister {
                oneClickRegister(email: "${this.email}", mobilePhone: "${this.phoneNumber}", purseType: BTC, token: "") {
                    username
                    password
                    passwordToken
                    accessToken
                    refreshToken
                }
            }`;

            const headers = {
                'Content-Type': 'application/json'
            };

            const res = http.post('https://api-dev.focusbet.io/graphql', JSON.stringify({ query: mutation }), {
                headers: headers,
            });

            if (res.json().data != null) {
                isRegistered = true;
                login = res.json().data.oneClickRegister.username.split('#')[1];
                console.log(this.login);
            } else {
                console.log("error");
                this.generateUser();
            }
        }
        return login;
    }
}

