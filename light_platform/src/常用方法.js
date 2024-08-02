import * as 全局 from "./系统常量.js";
import {ElMessage, ElMessageBox} from "element-plus";
import queryString from 'query-string';
import {reactive, ref} from "vue";
import {接口前缀} from "./系统常量.js";
import {国际化翻译表} from "@/国际化.js";

export const 语言=localStorage.轻量化国际化语言||'zhCn';

const 自动生成国际化翻译表=localStorage.自动生成国际化翻译表?JSON.parse(localStorage.自动生成国际化翻译表):{};
function 翻译(n){
    const 当前语言包=国际化翻译表.列表[语言];
    const 回退语言包=国际化翻译表.列表[国际化翻译表.回退语言];
    try {
        const 分割=n.split('.');
        if(分割.length>1){
            const 分类=分割[0];
            const 键=分割[1];
            if(!自动生成国际化翻译表[分类]){
                自动生成国际化翻译表[分类]={};
            }
            自动生成国际化翻译表[分类][键]=键;
            localStorage.自动生成国际化翻译表=JSON.stringify(自动生成国际化翻译表);
            return 当前语言包?.[分类]?.[键]??回退语言包?.[分类]?.[键]??键;
        }else {
            return n;
        }
    }catch (e){
        return n;
    }
}
String.prototype.t = function(n='全局通用') {
    return 翻译(`${n.value||n}.${this}`);
};

export function 消息(消息内容='成功',消息颜色='success'){
    let type="success";
    switch (消息颜色){
        case -1:console.log(消息内容);return;break;
        case 1:type='error';break;
        case 2:type='success';break;
        case 3:type='info';break;
        case 4:type='warning';break;
        default:type=消息颜色;break;
    }
    ElMessage({
        message:消息内容,
        type,
        center: true,
        showClose: true,
        duration:5000,
        grouping: true,
    })
}

export async function 提示框(消息内容='成功',消息颜色='info',类型='alert',消息标题="",额外配置={}){
    //类型有: alert,confirm,prompt
    let type="success";
    switch (消息颜色){
        case 1:type='error';break;
        case 2:type='success';break;
        case 3:type='info';break;
        case 4:type='warning';break;
        default:type=消息颜色;break;
    }
    let 配置项={
        draggable: true,
        dangerouslyUseHTMLString: true,
        type,
    }
    配置项={...配置项,...额外配置}
    const 消息正文=`<span style="word-break: break-all">${消息内容}</span>`;
    switch (类型){
        case 'alert':{
            try {
                return (await ElMessageBox.alert(消息正文,消息标题,配置项)==='confirm')
            }catch (e) {
                return false;
            }
        }break;
        case 'confirm':{
            try {
                return (await ElMessageBox.confirm(消息正文,消息标题,配置项)==='confirm');
            }catch (e) {
                return false;
            }
        }break;
        case 'prompt':{
            return ElMessageBox.prompt(消息正文,消息标题,配置项);
        }break;
    }

}

export const router=reactive({名称:'欢迎',传参:{},外链:false});
export let 路由历史=ref([]);
export function 路由跳转(路由名='欢迎',传参={},外链=false){
    if(localStorage[`轻量化外链路由缓存_${路由名}`]&&!外链){
        外链=localStorage[`轻量化外链路由缓存_${路由名}`]
    }
    location.hash=路由名;
    router.名称=路由名;
    router.传参=传参;
    router.外链=外链;
    if(外链){
        localStorage[`轻量化外链路由缓存_${路由名}`]=外链;
    }
    if(!路由历史.value.find(n=>{return n.路由名===路由名})){
        路由历史.value.push({路由名,传参,外链});
    }
}

export async function 请求接口(地址='',请求方式='get',body={},headers={},无需token=false,文件下载名=false){
    if(全局.Tenant_Id&&全局.Tenant_Id.length>0){
        headers['Tenant-Id']=全局.Tenant_Id;
    }
    if(全局.Client_Id&&全局.Client_Id.length>0){
        headers['clientid']=全局.Client_Id;
    }
    switch (语言){
        case 'zhCn':headers['content-language']='zh_CN';break;
        case 'en':headers['content-language']='en_Us';break;
    }
    let 请求数据是FormData=false;
    if(body instanceof FormData){
        请求数据是FormData=true;
    }
    if(!请求数据是FormData){
        headers['Content-Type']="application/json";
    }
    if(!无需token){
        headers['Authorization']=`Bearer ${encodeURIComponent(localStorage.湖山轻量化token)}`; //其他组件需要token,请使用 inject("全局token")
    }
    let 请求体={
        method: 请求方式, // GET, POST, PUT, DELETE, etc.
        mode: 'cors',
        cache: 'no-cache',
        headers,
    }
    if(请求方式=='get'){
        if(body&&Object.keys(body).length > 0) {
            地址+=`?${queryString.stringify(body)}`;
        }  
    }else {
        请求体.body=请求数据是FormData?body:JSON.stringify(body);
    }


    function 根据接口地址查询接口分类(接口地址){
        for(let i=0;i<接口前缀.length;i++){
            const 分类名=接口前缀[i].前缀;
            for(let j=0;j<接口前缀[i].旗下接口;j++){
                const 接口名=接口前缀[i].旗下接口[j];
                if(接口名===地址){
                    return `/${分类名}`;
                }
            }
        }
        return ''; //没有找到返回空字符串
    }

    try {
        let res=await fetch(`${运维配置_接口地址}${根据接口地址查询接口分类(地址)}${地址}`,请求体);
        if(res.ok){
            if(文件下载名){
                let data=await res.blob();
                下载文件(data,文件下载名,false);
                return true;
            }
            let data=await res.json();
            switch (data.head.code){
                case 200:{
                    if(!data.data&&data.data!=[]){
                      return true;
                    }
                    return data.data;
                }break;
                case 401:{
                    let data0=await 提示框(data.head.message,1,'alert','登录失效');
                    if(data0){
                        localStorage.湖山轻量化token='未登录';
                        location.hash='登录';
                        location.reload();
                        return false;
                    }
                }break;
                default:{
                    报错(data.head.message);
                    return false;
                }break;
            }
        }else {
            报错('发生网络异常,请检查网络和服务器');
            return false;
        }
    }catch (err) {
        报错(`服务器出错了,${err}`);
        return false;
    }

    function 报错(message){
        消息(`${message}`,'error');
    }
}

export const 字典彩虹表=reactive({});
export async function 字典转化(字段){
    if(字典彩虹表[字段]&&字典彩虹表[字段]!=-1){
        return 字典彩虹表[字段];
    }
    if(字典彩虹表[字段]===-1){
        return new Promise(fh => {
            setTimeout(async () => {
                fh(await 字典转化(字段));
            }, 500);
        });
    }
    if(!字典彩虹表[字段]){
        字典彩虹表[字段]=-1;
        const 新字典=await 获取字典(字段);
        字典彩虹表[字段]=新字典;
        return 新字典;
    }
}

async function 获取字典(字段){
    let data=await 请求接口(`/system/dict/data/type/${字段}`);
    if(data){
        if(data.length<=0){
            消息(`字典字段缺少${字段},请告知管理员加上`,1);
        }
        return data.map(n=>{return {value:n.dictValue,label:n.dictLabel,type:n.listClass}})
    }else {
        return [];
    }
}

export function 下载文件(文件内容或路径_字符串='',文件名='下载内容',是路径=false) {
    //文件内容需要转为字符串
    const a = document.createElement("a");
    a.download = 文件名;
    if(是路径){
        a.href=文件内容或路径_字符串;
    }else {
        a.href = URL.createObjectURL(new Blob([文件内容或路径_字符串]));
    }
    a.click();
    a.remove();
};