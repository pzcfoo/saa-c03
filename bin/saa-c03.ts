#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SaaC03Stack } from '../lib/saa-c03-stack';
import { ApiCustomDnsStack } from '../lib/rest-api-custom-dns-stack'
import { WsApiCustomDnsStack } from '../lib/ws-api-custom-dns-stack'

const app = new cdk.App();
new SaaC03Stack(app, 'SaaC03Stack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});


new ApiCustomDnsStack(app, 'TestApiStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});

new WsApiCustomDnsStack(app, 'WsApiStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
