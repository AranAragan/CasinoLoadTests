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
        exec: 'createBonusWithTransferTest',
        rate: 10,
        timeUnit: '1s',
        duration: '60s',
        preAllocatedVUs: 10,
        maxVUs: 50,
    },
    checkMaxCreateBonusAccountWithTransfer: {
        executor: 'constant-arrival-rate',
        exec: 'createBonusWithTransferTest',
        rate: 25,
        timeUnit: '1s',
        duration: '60s',
        preAllocatedVUs: 1000,
        maxVUs: 5000,
    },
    rumpingCreateBonusAccountWithTransferDuringFiveMinutes: {
        executor: 'ramping-arrival-rate',
        exec: 'createBonusWithTransferTest',
        executor: 'ramping-arrival-rate',
        startRate: 10,
        timeUnit: '1s',
        preAllocatedVUs: 1000,
        maxVUs: 3000,
        stages: [
            { target: 10, duration: '30s' },
            { target: 25, duration: '4m' },
            { target: 10, duration: '30s' },
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


export function createBonusWithTransferTest() {
    let length = 15;
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

    const dataSuccess = {
        "id": {
            "clientId": clientId,
            "referenceId": toString(referenceId),
            "referenceType": "BONUS_ACCOUNT_REFERENCE_TYPE_OFFER"
        }
    };


    let responseOpen = client.invoke('bonusApp.BonusAccountService/open', dataOpen);
    check(responseOpen, {
        'open status is 0': (r) => r.status == 0
    });

    let responseStart = client.invoke('bonusApp.BonusTransferService/start', dataTransfer);
    check(responseStart, {
        'start status is 0': (r) => r.status == 0
    });

    let responseSuccess = client.invoke('bonusApp.BonusTransferService/success', dataSuccess);
    check(responseSuccess, {
        'success status is 0': (r) => r.status == 0,
    })

    client.close();
};