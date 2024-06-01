import grpc from 'k6/net/grpc';
import { Utils } from './generators/generators.js';
import { sleep, check } from 'k6';

const client = new grpc.Client();
client.load(['definitions'], 'app.proto');
let clientId;
let referenceId = 1;

let scenarios = {
    baseCreateBonusAccountWithTransferTest: {
        executor: 'constant-arrival-rate',
        exec: 'createBonusWithTransferAndCloseBonusAccountTest',
        rate: 10,
        timeUnit: '1s',
        duration: '60s',
        preAllocatedVUs: 10,
        maxVUs: 50,
    },

    checkMaxCreateBonusAccountWithTransferAndGetInfo: {
        executor: 'constant-arrival-rate',
        exec: 'createBonusWithTransferAndCloseBonusAccountTest',
        rate: 20,
        timeUnit: '1s',
        duration: '60s',
        preAllocatedVUs: 1000,
        maxVUs: 5000,
    },
    rumpingCreateBonusAccountWithTransferAndGetInfoDuringFiveMinutes: {
        executor: 'ramping-arrival-rate',
        exec: 'createBonusWithTransferAndCloseBonusAccountTest',
        executor: 'ramping-arrival-rate',
        startRate: 10,
        timeUnit: '1s',
        preAllocatedVUs: 1000,
        maxVUs: 5000,
        stages: [
            { target: 5, duration: '30s' },
            { target: 20, duration: '4m' },
            { target: 5, duration: '30s' },
        ],
    }
}

export let options = {
    scenarios: {},
    thresholds: {
        http_req_failed: ['rate<0.01'], // http errors should be less than 1%
        http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
    },
};

if (__ENV.scenario) {
    // Use just a single scenario if `--env scenario=whatever` is used
    options.scenarios[__ENV.scenario] = scenarios[__ENV.scenario];
} else {
    // Use all scenrios
    options.scenarios = scenarios;
}


export function createBonusWithTransferAndCloseBonusAccountTest() {
    let length = 19;
    clientId = Utils.generateRandomNumber(length);
    referenceId = Utils.generateRandomNumber(length);

    client.connect('206.189.251.143:3100', {
        plaintext: true
    });

    const dataOpen = {
        "amount": "14",
        "currency": "USD",
        "id": {
            "clientId": clientId,
            "referenceId": toString(referenceId),
            "referenceType": "BONUS_ACCOUNT_REFERENCE_TYPE_OFFER"
        },
        "withdrawMax": "100"
    };

    const dataTransfer = {
        "id": {
            "clientId": clientId,
            "referenceId": toString(referenceId),
            "referenceType": "BONUS_ACCOUNT_REFERENCE_TYPE_OFFER"
        },
        "withdrawTarget": "100"
    };

    const dataStatus = {
        "id": {
            "clientId": clientId,
            "referenceId": toString(referenceId),
            "referenceType": "BONUS_ACCOUNT_REFERENCE_TYPE_OFFER"
        }
    };

    const dataTotalBalance = {
            "clientId": clientId,
            "referenceType": "BONUS_ACCOUNT_REFERENCE_TYPE_OFFER"
    };
    

    let responseOpen = client.invoke('bonusApp.BonusAccountService/open', dataOpen);
    check(responseOpen, {
        'open status is 0': (r) => r.status == 0
    });

    let responseStart = client.invoke('bonusApp.BonusTransferService/start', dataTransfer);
    check(responseStart, {
        'start status is 0': (r) => r.status == 0
    });

    let responseStatus = client.invoke('bonusApp.BonusTransferService/status', dataStatus);
    check(responseStatus, {
        'status request status is 0': (r) => r.status == 0,
    })

    let responseTotalBalance = client.invoke('bonusApp.BonusAccountService/totalBalance', dataTotalBalance);
    check(responseTotalBalance, {
        'close status is 0': (r) => r.status == 0
    });

    client.close();
};