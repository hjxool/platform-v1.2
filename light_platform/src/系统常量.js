export const 系统名称='轻量化云平台';
document.title=系统名称;
export const 系统版本='轻量化 V1.2.0';
export const 品牌='湖山';

export const 服务器IP=运维配置_服务器IP;
export const 接口地址=运维配置_接口地址;
export const websocket地址=运维配置_websocket地址;
export const Tenant_Id=运维配置_Tenant_Id;
export const Client_Id=运维配置_Client_Id;

export const 接口前缀=[
    {前缀:'api',旗下接口:['/system/notice','/system/tenant']},
    {前缀:'user',旗下接口:['/system/tenant/changeStatus','/demo/redis/pubsub/sub']},
];
