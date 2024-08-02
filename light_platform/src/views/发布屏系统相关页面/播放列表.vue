<template>
	<div id="index" v-loading="loading">
		<!-- 搜索栏 -->
		<myform ref="search_dom" :formConfig="search_config" @handleQuery="get_data" @resetQuery="resetQuery" style="padding-left: 20px"></myform>

		<div class="body">
			<mytable style="width: 100%" :卡片列表数据="table.data" :卡片列表高度="table.height" :卡片列表当前页数="table.page.cur" @改变页数="get_data">
				<template #卡片列表按钮插槽>
					<el-button @click="show_play_list()" type="success">新增播放列表</el-button>
				</template>

				<template #卡片列表内容插槽="scope">
					<div class="card">
						<div class="box1">
							<img v-show="scope.row.thumbnailUrl" :src="scope.row.thumbnailUrl" class="bg_img" />
							<img v-show="!scope.row.thumbnailUrl" src="./img/icon.png" class="bg_img" />
							<div v-show="scope.row.created" class="box1_1">{{ scope.row.created }}</div>
						</div>

						<div class="box2 flex_shrink row_layout">
							<span class="text text_ellipsis">{{ scope.row.playListName }}</span>

							<el-dropdown @command="operation($event, scope.row)">
								<el-button type="primary" size="mini">
									操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
								</el-button>
								<template #dropdown>
									<el-dropdown-menu>
										<el-dropdown-item command="instant">即时发布</el-dropdown-item>
										<el-dropdown-item command="timing">定时发布</el-dropdown-item>
										<el-dropdown-item command="material">编辑</el-dropdown-item>
										<el-dropdown-item command="delete">删除</el-dropdown-item>
									</el-dropdown-menu>
								</template>
							</el-dropdown>
						</div>
					</div>
				</template>
			</mytable>
		</div>

		<!-- 发布组件 -->
		<publish v-model="publishDialog.visiable" :发布源类型="publishDialog.sourceType" :发布源Id="publishDialog.id" :发布类型="publishDialog.type" :回调方法="publishDialog.回调方法"></publish>
		<!-- 弹窗 -->
		<div class="popover" v-if="popup.show">
			<div class="edit_box" v-loading="popup.loading">
				<iframe id="edit" :src="popup.url" frameborder="0" scrolling="no" style="flex-grow: 1"></iframe>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import myform from '@/components/表单组件/表单组件.vue';
import { 提示框, 消息 } from '@/常用方法.js';
import mytable from '@/components/通用表格组件/通用卡片列表组件.vue';
import { 请求接口 as request } from '@/常用方法.js';
import publish from '@/components/发布组件/发布计划.vue';
import { 接口地址, Tenant_Id, Client_Id } from '@/系统常量.js';

// 钩子函数
onMounted(async () => {
	let dom = document.querySelector('.body');
	console.log(dom.clientHeight);
	table.value.height = dom.clientHeight - 50 - 32 - 80; // 减去组件头部按钮行高 以及 分页行高
	// 查询场景列表
	get_data(1);
});

// 监听页面事件
window.onmessage = (data) => {
	console.log('子页面消息', data);
	switch (data.data.type) {
		case 'close':
			popup.value.show = false;
			break;
		case 'close and refresh':
			popup.value.show = false;
			search_dom.value.resetQuery();
			break;
		case 'Loading off':
			loading.value = false;
			break;
		case 'Loading on':
			loading.value = true;
			break;
		case 'Close popup':
			popup.value.show = false;
			消息(data.data.msg || '', 'success');
			break;
	}
};

// 变量
const loading = ref(false); // 加载遮罩
const search_dom = ref(); // 搜索栏组件实例
// 搜索配置
const search_config = ref([
	{
		type: 'input',
		label: '模糊搜索',
		prop: 'searchValue',
	},
]);
// 表格参数
const table = ref({
	page: {
		cur: 1, // 分页查询 当前页
		size: 20, // 分页查询 单页显示数量
	},
	data: {
		data: [],
		total: 0,
	},
	height: 0,
});
// 弹窗
const popup = ref({
	show: false, // 弹窗显示
	loading: false, // 加载遮罩
	url: '', // 嵌入页面地址
});
// 发布计划弹窗
const publishDialog = ref({
	visiable: false,
	sourceType: 5, //视频源 0 内部直播视频源 1 外部直播视频源 2 公共素材 3 内置模板 4 自定义模板
	id: '',
	type: 1, //即时是1  定时 2
	回调方法: (val) => {
		if (val) {
			publishDialog.value.visiable = false;
			search_dom.value.resetQuery();
		}
	},
});
// 嵌入的页面所需请求密钥
let token = inject('全局token');

// 方法
// 查询列表
const get_data = async (params) => {
	let body = {};
	switch (typeof params) {
		case 'object':
			// 如果是点搜索 则解析传入参数
			if (params.searchValue) {
				body.searchValue = params.searchValue;
			}
			break;
		case 'number':
			// 如果是切页 改变当前页
			table.value.page.cur = params;
			break;
	}
	loading.value = true;
	let res = await request(`/video/search/playList`, 'get', {
		pageNum: table.value.page.cur,
		pageSize: table.value.page.size,
		...body,
	});
	loading.value = false;
	table.value.data.total = 0;
	table.value.data.data = [];
	if (res) {
		table.value.data.total = res.total;
		table.value.data.data = res.data;
	}
};
// 重置按钮
const resetQuery = () => {
	get_data(1);
};
// 卡片操作
const operation = (type, obj) => {
	switch (type) {
		case 'instant':
			publishDialog.value.visiable = true;
			publishDialog.value.type = 1;
			publishDialog.value.id = obj.id;
			return;
		case 'timing':
			publishDialog.value.visiable = true;
			publishDialog.value.type = 2;
			publishDialog.value.id = obj.id;
			return;
		case 'material':
			show_play_list(obj.id);
			return;
		case 'delete':
			del_playlist(obj);
			return;
	}
};
// 显示播放列表弹窗
const show_play_list = (id) => {
	popup.value.show = true;
	popup.value.url = `/旧页面/dlc/playlist_edit/index.html?token=${token}&id=${id || ''}&url=${接口地址}&clientId=${Client_Id}&tenantId=${Tenant_Id}`;
};
// 删除播放列表
const del_playlist = async (obj) => {
	let res = await 提示框(`确认删除 ${obj.playListName} 播放列表?`);
	if (res) {
		await request(`/video/delete/playList/${obj.id}`, 'delete');
		search_dom.value.resetQuery();
	}
};
</script>

<style lang="less" scoped>
@import '@/assets/css/common/hj_common.css';

#index {
	width: 100%;
	height: 100%;
	background: #fff;
	display: flex;
	flex-direction: column;
	position: relative;
	> .body {
		flex-grow: 1;
	}
}
.card {
	width: 260px;
	height: 200px;
	background: #eef2fe;
	border-radius: 6px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	margin: 10px;
	> .box1 {
		flex-grow: 1;
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		> .box1_1 {
			padding: 1px 3px;
			color: #fff;
			font-size: 10px;
			background-color: rgba(72, 76, 82, 0.8);
			align-self: start;
		}
	}
	> .box2 {
		padding: 6px;
		justify-content: space-between;
		overflow: hidden;
		> .text {
			font-size: 14px;
			font-weight: bold;
		}
	}
}
.popover {
	position: absolute;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.2);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 990;
	> .edit_box {
		overflow: hidden;
		height: 80%;
		background: #fff;
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		width: 96%;
		min-width: 800px;
	}
}
</style>
