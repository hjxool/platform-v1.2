<template>
	<el-config-provider :locale="eleme当前语言(当前语言)">
		<div style="width: 100vw; height: 100vh; background: #eef6fe" class="pl">
			<img src="./通用UI资源/主体框架/主体背景.png" style="width: 100%; height: 100%; object-fit: cover; position: absolute; z-index: 0" />

      <login v-if="需要登录" @登录成功回调="(n) => {登录成功回调(n);}" style="z-index: 1"></login>

			<div v-loading="首页加载" v-if="!需要登录" style="width: 100vw; height: 100vh; z-index: 1" class="pl">
				<div style="width: 200px; height: 100%; position: relative" class="pl">
					<img src="./通用UI资源/主体框架/左侧边栏背景.png" style="width: 100%; height: 100%; object-fit: cover; position: absolute; z-index: 0" />
					<img src="./品牌素材资源/左上小卡片.png" style="object-fit: contain; height: 139px; width: 90%; z-index: 1" />
					<div style="width: 100%; height: calc(100% - 139px); z-index: 1" class="pl">

						<!-- <left_menu :路由视图="路由视图" :菜单栏改变路由="菜单栏改变路由"></left_menu> -->

						<left_menu_style2 :路由视图="路由视图" :菜单栏改变路由="菜单栏改变路由"></left_menu_style2>

          </div>
				</div>

				<div style="width: calc(100% - 200px); height: 100%" class="pl">
					<div style="width: 100%; height: 50px" class="pl">
						<top_menu />
					</div>
					<div style="width: 100%; height: calc(100% - 50px)" class="pl">
						<router_views :router="router" />
					</div>
				</div>
			</div>

		</div>
	</el-config-provider>
</template>

<script setup>
import { ref, provide, onMounted, inject, watch } from 'vue';
import * as 全局 from './系统常量.js';
import login from './views/其他页面/登录.vue';
import top_menu from './views/其他页面/顶部菜单栏.vue';
import left_menu from './views/其他页面/左侧菜单栏.vue';
import left_menu_style2 from './views/其他页面/左侧菜单栏2.vue';
import router_views from './路由配置.vue';
import { 消息, 请求接口, router, 路由跳转, 提示框 } from '@/常用方法.js';
import { Client_Id } from './系统常量.js';

const 当前语言 = ref(localStorage.轻量化国际化语言 || 'zhCn');

import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import en from 'element-plus/dist/locale/en.mjs';
function eleme当前语言(n) {
	switch (n) {
		case 'zhCn':
			return zhCn;
			break;
		case 'en':
			return en;
			break;
	}
}

const 首页加载=ref(true);
const 需要登录 = ref(true);
const token = localStorage.湖山轻量化token;
const 路由视图 = ref([]);
const 全局socket消息 = ref();
const 全局socket = ref();
provide('全局socket消息', 全局socket消息);
provide('全局socket', 全局socket);
// 子页面监听消息
// const 全局socket消息=inject("全局socket消息");
// watch(全局socket消息,()=>{
//   const socket消息=全局socket消息.value.内容;
//   提示框(socket消息,2,'alert','命令调试-设备反馈');
// })

onMounted(() => {
	document.body.style.setProperty('--el-color-primary', '#115dbf');
	if (token && token != '未登录') {
		需要登录.value = false;
		provide('全局token', token);
		全局连接webscoket();
		获取全局权限();
	} else {
		location.hash = '登录';
	}
});

function 登录成功回调(n) {
	localStorage.湖山轻量化token = n;
	location.hash = '欢迎';
	location.reload();
}

async function 获取全局权限() {
	let data = await 请求接口('/system/menu/getRouters');
	if (data) {
    首页加载.value=false;
		路由视图.value = data;
		const hash = decodeURI(location.hash.substr(1));
		if (hash) {
			路由跳转(hash);
		}
	}
}

function 菜单栏改变路由(n, 路径) {
	let 菜单 = 路由视图.value.find((m) => {
		return m.component == 路径[0];
	});
	if (菜单 && 路径.length > 1) {
		菜单 = 菜单.children.find((m) => {
			return m.component == 路径[1];
		});
	}
	路由跳转(n, {}, 菜单?.path ? 菜单.path : false);
}

function 全局连接webscoket() {
	const 地址 = `${运维配置_websocket地址}?clientid=${全局.Client_Id}&Authorization=Bearer ${token}`;
	全局socket.value = new WebSocket(地址);

	全局socket.value.onopen = (e) => {
		消息(`webscoket已连接`, 2);
	};

	全局socket.value.onerror = (e) => {
    消息('webscoket连接错误,原因如下:', -1);
    消息(e, -1);
  };

	全局socket.value.onclose = (e) => {
    消息(`webscoket连接断开,错误码: ${e.code},正在尝试重连`, 4);
    全局socket.value=null;
    setTimeout(() => {
      全局连接webscoket();
    }, 3000);
	};

	全局socket.value.onmessage = (e) => {
		try {
			const 消息 = JSON.parse(e.data);
			//处理全局消息
			全局socket消息.value = { 内容: 消息, 随机: Math.random() };
		} catch (e) {
			提示框(`服务器发送了未定义无法解析的消息: ${e.data}`, 1, 'alert', '无法解析的消息');
		}
	};
}

setInterval(() => {
  //保活
  if (全局socket?.value?.readyState === 1) {
    全局socket.value.send(JSON.stringify({ type: 'ping', time: Date.now() }));
  }
}, 10000);

</script>
