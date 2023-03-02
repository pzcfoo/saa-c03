
const path = require("path");
import { Construct } from 'constructs';
import {
    StackProps,
    Stack,
    CfnOutput,
    aws_iam as iam,
    aws_route53_targets as targets,
    aws_route53 as r53,
    aws_certificatemanager as acm,
    aws_lambda as lambda,
    aws_apigateway as apigateway,
    aws_apigatewayv2 as apigwv2,
} from 'aws-cdk-lib'
import { WebSocketApi, WebSocketStage, DomainName, ApiMapping } from "@aws-cdk/aws-apigatewayv2-alpha";
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';


export class WsApiCustomDnsStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);


        // create lambdas backends for ws api
        const connectHandler = new lambda.Function(this, 'connect-handler', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'function.connect_handler',
            code: lambda.Code.fromAsset(path.join("lib", "lambdas"))
        });

        const disconnectHandler = new lambda.Function(this, 'disconnect-handler', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'function.disconnect_handler',
            code: lambda.Code.fromAsset(path.join("lib", "lambdas"))
        });

        const onMessageHandler = new lambda.Function(this, 'onmessage-handler', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'function.onmessage_handler',
            code: lambda.Code.fromAsset(path.join("lib", "lambdas"))
        });

        // create ws api
        const websocketApi = new WebSocketApi(this, "test-ws-api-gateway", {
            connectRouteOptions: {
                integration: new WebSocketLambdaIntegration("connect-integration", connectHandler),
            },
            disconnectRouteOptions: {
                integration: new WebSocketLambdaIntegration("disconnect-integration", disconnectHandler),
            },
        });
        websocketApi.addRoute("message", {
            integration: new WebSocketLambdaIntegration("onmessage-handler", onMessageHandler),
        });

        const hostedZone = r53.HostedZone.fromLookup(this, 'test-hosted-zone', { domainName: 'yoloswag.org' });
        const customDomainName = `ws.${hostedZone.zoneName}`
        const cert = new acm.Certificate(this, 'test-cert', {
            domainName: customDomainName,
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });
        const wsDomain = new DomainName(this, 'domain-name', {
            domainName: customDomainName,
            certificate: cert
        })
        // Dns record for the new domain name
        new r53.ARecord(this, 'test-a-record', {
            zone: hostedZone,
            recordName: customDomainName,
            target: r53.RecordTarget.fromAlias(
                new ApiGatewayv2DomainProperties(
                    wsDomain.regionalDomainName,
                    wsDomain.regionalHostedZoneId,
                )
            )
        });

        // the deploy stage for the api
        // The custon domman name mapping is also applied here.
        const deployStage = new WebSocketStage(this, 'test-ws-stage', {
            stageName: "prod",
            autoDeploy: true,
            webSocketApi: websocketApi,
            domainMapping: {
                domainName: wsDomain
            }
        })

        // allow message handler to manage connections for 'posting' back to connections
        onMessageHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["execute-api:ManageConnections"],
            resources: [`arn:aws:execute-api:${this.region}:${this.account}:${websocketApi.apiId}/${deployStage.stageName}/*`],
        }));
        new CfnOutput(this, "api-url", { value: websocketApi.apiEndpoint });
    }
}
