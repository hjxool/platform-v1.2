<template>
	<template v-for="i in 路由历史" :key="i.路由名" :track-by="i.路由名">
		<iframe
			v-if="i.外链"
			v-show="i.路由名 == router.名称"
			style="width: 100%; height: 100%"
			frameborder="0"
			:src="encodeURI(`${i.外链}?token=${token}&ip=${运维配置_服务器IP}&menu=${i.路由名}`)"
		></iframe>
	</template>

	<test v-if="router.名称 == '测试卡片'" />
	<test2 v-if="router.名称 == '测试页面2'" />
	<welcome v-if="router.名称 == '欢迎'" />
	<user v-if="router.名称 == '用户管理'" />
	<dept v-if="router.名称 == '部门管理'" />
	<dicttype v-if="router.名称 == '字典管理'" />
	<dictdata v-if="router.名称 == '字典数据'" />
	<!--    <product_list v-show="router.名称 == '产品列表'" v-if="路由历史.findIndex(n=>{return n.路由名==='产品列表'})!=-1"/>-->
	<!--    <device_list v-show="router.名称 == '设备列表'" v-if="路由历史.findIndex(n=>{return n.路由名==='设备列表'})!=-1"/>-->
	<product_list v-if="router.名称 == '产品列表'" />
	<device_list v-if="router.名称 == '设备列表'" />
	<post v-if="router.名称 == '岗位管理'" />
	<role v-if="router.名称 == '角色管理'" />
	<authuser v-if="router.名称 == '分配用户'" />
	<config v-if="router.名称 == '参数设置'" />
	<operlog v-if="router.名称 == '操作日志'" />
	<loginlog v-if="router.名称 == '登录日志'" />
	<personal v-if="router.名称 == '个人中心'" />
	<tag v-if="router.名称 == '标签管理'" />
	<product_category v-if="router.名称 == '产品分类'" />
	<Visual_icon v-if="router.名称 == '可视化图标'" />
	<Visual_icon_type v-if="router.名称 == '可视化图标类型'" />
	<third_secret v-if="router.名称 == '第三方秘钥'" />
	<personal_material v-if="router.名称 == '个人素材'" />
	<public_material v-if="router.名称 == '公共素材'" />
	<device_monitoring v-if="router.名称 == '设备监控'" />
	<System_template v-if="router.名称 == '系统模板'" />
	<Custom_template v-if="router.名称 == '自定义模板'" />
	<Menu_management v-if="router.名称 == '菜单管理'" />
	<device_management v-if="router.名称 == '设备管理'" />
	<device_contro v-if="router.名称 == '设备管控'" />
	<Scene_log v-if="router.名称 == '场景日志'" />
	<Project_overview v-if="router.名称 == '项目总览'" />
	<Device_alarm v-if="router.名称 == '设备告警'" />
	<Scene_rule v-if="router.名称 == '场景规则'" />
	<Scene_config v-if="router.名称 == '场景配置'" />
	<user_scene_setting v-if="router.名称 == '用户_场景设置'" />
	<Meeting_management_workbench v-if="router.名称 == '会管工作台'" />
	<Meeting_room_setup v-if="router.名称 == '会议室设置'" />
	<meeting_reservation v-if="router.名称 == '会议预约'" />
	<Meeting_room_calendar v-if="router.名称 == '会议室日历'" />
	<release_management v-if="router.名称 == '发布管理'" />
	<material_management v-if="router.名称 == '素材管理'" />
	<system_setting v-if="router.名称 == '系统设置'" />
	<Conference_audit v-if="router.名称 == '会议审核'" />
	<today_meeting v-if="router.名称 == '今日会议'" />
	<mine_meeting v-if="router.名称 == '我的会议'" />
	<items_config v-if="router.名称 == '物品配置'" />
	<meeting_statistics v-if="router.名称 == '会议室使用统计'" />
	<Meeting_calendar v-if="router.名称 == '会议日历'" />
	<attendant v-if="router.名称 == '服务人员'" />
	<BroadcastTechnologyTest v-if="router.名称 == '广播技术测试'" />
	<BroadcastSystemAudioCapTest v-if="router.名称 == '系统音频捕获'" />
	<monitor_management v-if="router.名称 == '屏幕管理'" />
	<audit_process v-if="router.名称 == '配置审核流程'" />
	<CMSC v-if="router.名称 == '集中控制'"></CMSC>
	<system_material v-if="router.名称 == '系统素材'" />
	<terminal_management v-if="router.名称 == '终端管理'"></terminal_management>
	<equipment_inspection v-if="router.名称 == '设备巡检'"></equipment_inspection>
	<group_management v-if="router.名称 == '分组管理'"></group_management>
	<playlist v-if="router.名称 == '播放列表'"></playlist>
	<breaking_task v-if="router.名称 == '广播系统插播任务'" />
</template>

<script setup>
import test from './views/其他页面/测试卡片页面.vue';
import welcome from './views/其他页面/欢迎.vue';
import product_list from './views/开发配置相关页面/产品列表.vue';
import device_list from './views/开发配置相关页面/设备列表.vue';
import Visual_icon from './views/可视化低代码相关页面/可视化图标.vue';
import Visual_icon_type from './views/可视化低代码相关页面/可视化图标类型.vue';
import tag from '@/views/开发配置相关页面/标签管理.vue';
import Device_alarm from '@/views/设备管控相关页面/设备告警.vue';
import Meeting_room_setup from '@/views/会议系统相关页面/会议室设置.vue';
import Conference_audit from '@/views/会议系统相关页面/会议审核.vue';
import BroadcastTechnologyTest from '@/views/广播系统相关页面/广播技术测试.vue';
//广播捕获系统音频测试
import BroadcastSystemAudioCapTest from '@/views/广播系统相关页面/系统音频捕获.vue';

// 用户管理页面
import user from '@/views/用户权限相关页面/用户管理/用户管理.vue';
// 部门管理页面
import dept from '@/views/用户权限相关页面/部门管理.vue';
// 字典状态管理页面
import dicttype from '@/views/开发配置相关页面/字典管理/字典状态管理.vue';
// 字典数据管理页面
import dictdata from '@/views/开发配置相关页面/字典管理/字典数据管理.vue';
// 岗位管理页面
import post from '@/views/用户权限相关页面/岗位管理.vue';
// 角色管理页面
import role from '@/views/用户权限相关页面/角色管理/角色管理.vue';
// 分配角色页面
import authuser from '@/views/用户权限相关页面/角色管理/分配用户.vue';
// 参数配置页面
import config from '@/views/开发配置相关页面/参数设置.vue';
// 操作日志页面
import operlog from '@/views/开发配置相关页面/操作日志.vue';
// 登录日志页面
import loginlog from '@/views/开发配置相关页面/登录日志.vue';
// 个人中心页面
import personal from '@/views/用户权限相关页面/个人中心/个人中心.vue';
// 产品分类
import product_category from '@/views/开发配置相关页面/产品分类.vue';
// 第三方秘钥
import third_secret from '@/views/开发配置相关页面/第三方秘钥.vue';
// 测试页面2
import test2 from '@/views/其他页面/测试页面2.vue';
//公共素材
import public_material from '@/views/其他页面/公共素材.vue';
//个人素材
import personal_material from '@/views/其他页面/个人素材.vue';

// 设备监控
import device_monitoring from '@/views/设备管控相关页面/设备监控.vue';

// 系统模板
import System_template from '@/views/发布屏系统相关页面/系统模板.vue';
// 自定义模板
import Custom_template from '@/views/发布屏系统相关页面/自定义模板/自定义模板.vue';
// 菜单管理
import Menu_management from '@/views/开发配置相关页面/菜单管理.vue';
// 设备管理
import device_management from '@/views/设备管控相关页面/设备管理.vue';
// 设备管控
import device_contro from '@/views/设备管控相关页面/设备管控.vue';
// 场景日志
import Scene_log from '@/views/其他页面/场景日志.vue';
// 项目总览
import Project_overview from '@/views/大数据相关页面/项目总览.vue';
// 场景规则
import Scene_rule from '@/views/设备管控相关页面/场景规则.vue';
// 场景配置
import Scene_config from '@/views/设备管控相关页面/场景配置/场景配置.vue';
// 用户场景设置
import user_scene_setting from '@/views/设备管控相关页面/用户_场景设置.vue';
// 会议预约
import meeting_reservation from '@/views/会议系统相关页面/会议预约.vue';
// 会管平台工作台
import Meeting_management_workbench from '@/views/大数据相关页面/会管工作台.vue';
// 会管平台会议室日历
import Meeting_room_calendar from '@/views/会议系统相关页面/会议室日历.vue';
// 发布管理
import release_management from '@/views/发布屏系统相关页面/发布管理.vue';
// 发布素材管理
import material_management from '@/views/发布屏系统相关页面/素材管理.vue';
// 系统设置
import system_setting from '@/views/会议系统相关页面/系统设置/系统设置.vue';
// 今日会议
import today_meeting from '@/views/会议系统相关页面/今日会议.vue';
// 我的会议
import mine_meeting from '@/views/会议系统相关页面/我的会议.vue';
// 物品配置
import items_config from '@/views/会议系统相关页面/物品配置.vue';
// 会议室使用统计
import meeting_statistics from '@/views/会议系统相关页面/会议室使用统计.vue';
// 会议日历
import Meeting_calendar from '@/views/会议系统相关页面/会议日历/会议日历.vue';
// 服务人员
import attendant from '@/views/会议系统相关页面/服务人员.vue';
// 屏幕管理
import monitor_management from '@/views/发布屏系统相关页面/屏幕管理.vue';
// 配置审核流程
import audit_process from '@/views/会议系统相关页面/配置审核流程.vue';
//集中管控
import CMSC from '@/views/设备管控相关页面/集中控制.vue';
//系统素材
import system_material from '@/views/其他页面/系统素材.vue';
// 终端管理
import terminal_management from '@/views/广播系统相关页面/终端管理.vue';
// 设备巡检
import equipment_inspection from '@/views/广播系统相关页面/设备巡检.vue';
// 分组管理
import group_management from '@/views/广播系统相关页面/分组管理.vue';
// 播放列表
import playlist from '@/views/发布屏系统相关页面/播放列表.vue';
// 插播任务
import breaking_task from '@/views/广播系统相关页面/插播任务.vue';

import { inject, onUnmounted } from 'vue';
import { 消息, 路由历史 } from '@/常用方法.js';

const props = defineProps({
	router: { default: { 名称: '欢迎', 传参: {} } },
});
const token = inject('全局token');

window.addEventListener('message', 监听第三方外链iframe事件);
function 监听第三方外链iframe事件(event) {
	switch (event.data.type) {
		case 'token失效刷新页面':
			{
				location.reload();
			}
			break;
	}
}
onUnmounted(() => {
	window.removeEventListener('message', 监听第三方外链iframe事件);
});
</script>

<style scoped></style>
