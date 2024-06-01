import grpc from 'k6/net/grpc';
import { Utils } from './generators/generators.js';
import { sleep, check } from 'k6';

const client = new grpc.Client();
client.load(['definitions'], 'app.proto');
let clientId;
let referenceId = 1;

let scenarios = {
    baseRegisterTest: {
        executor: 'constant-arrival-rate',
        exec: 'baseRegisterTest',
        rate: 10,
        timeUnit: '1s',
        duration: '60s',
        preAllocatedVUs: 10,
        maxVUs: 50,
    },
    checkMaxRegisterTest: {
        executor: 'constant-arrival-rate',
        exec: 'baseRegisterTest',
        rate: 100,
        timeUnit: '1s',
        duration: '60s',
        preAllocatedVUs: 1000,
        maxVUs: 5000,
    },
    rumpingRegisterTestDuringFiveMinutes: {
        executor: 'ramping-arrival-rate',
        exec: 'baseRegisterTest',
        executor: 'ramping-arrival-rate',
        startRate: 10,
        // Start `startRate` iterations per minute
        timeUnit: '1s',
        // Pre-allocate necessary VUs.
        preAllocatedVUs: 100,
        maxVUs: 1000,
        stages: [
            { target: 10, duration: '30s' },
            { target: 100, duration: '4m' },
            { target: 10, duration: '30s' },
        ],
    }
    ,
    checkCriticalRegisterTestDuringFiveMinutesWithRumping: {
        executor: 'ramping-arrival-rate',
        exec: 'baseRegisterTest',
        executor: 'ramping-arrival-rate',
        startRate: 10,
        // Start `startRate` iterations per minute
        timeUnit: '1s',
        // Pre-allocate necessary VUs.
        preAllocatedVUs: 100,
        maxVUs: 1000,
        stages: [
            { target: 10, duration: '30s' },
            { target: 100, duration: '4m' },
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


export function baseRegisterTest() {
    let length = 11;
    clientId = Utils.generateRandomNumber(length);
    referenceId = Utils.generateRandomNumber(length);

    client.connect('206.189.251.143:3100', {
        plaintext: true
    });

    const data = {
        "amount": "14",
        "currency": "USD",
        "id": {
            "clientId": clientId,
            "referenceId": toString(referenceId),
            "referenceType": "BONUS_ACCOUNT_REFERENCE_TYPE_OFFER"
        },
        "withdrawMax": "100"
    };

    let response = client.invoke('bonusApp.BonusAccountService/open', data);
    let status = response.status;
    check(status, {
        'is status 0': (r) => r == 0
    });

    client.close();
};