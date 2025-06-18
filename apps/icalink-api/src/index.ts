import StratixApp, { type IStratixApp } from '@stratix/core';
const ivHex = '1748ee5e6e06d21668556d72242fb575';
const iv = Buffer.from(ivHex, 'hex');
console.log(iv);

StratixApp.run({ loglevel: 'debug' }).then(async (app: IStratixApp) => {});
