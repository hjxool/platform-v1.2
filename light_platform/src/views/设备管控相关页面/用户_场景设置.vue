<template>
	<div id="index" v-loading="loading">
		<myform ref="search_dom" :formConfig="search_config" @handleQuery="get_scene_list" @resetQuery="resetQuery"></myform>
		<div class="body">
			<mytable :表格高度="table.height" :表格数据="table.data" :表格当前页数="table.page.cur" @改变页数="get_scene_list">
				<template #表格按钮插槽>
					<el-button @click="edit_scene('add')" type="primary" icon="Plus">新建场景</el-button>

					<el-radio-group v-model="table.type" @change="change_scene_type">
						<el-radio-button v-for="item in table.type_options" :label="item.label" :value="item.value" />
					</el-radio-group>
				</template>

				<template #表格内容插槽>
					<el-table-column label="名称" align="center" prop="sceneName" />
					<!-- 手动场景 -->
					<template v-if="table.type === 1">
						<el-table-column label="创建时间" align="center" prop="createTime" />
						<el-table-column label="更新时间" align="center" prop="updateTime" />
					</template>
					<!-- 自动场景 -->
					<template v-if="table.type === 2">
						<el-table-column label="执行周期" align="center">
							<template #default="scope">
								<el-tag v-for="t in scope.row.excu_list" type="warning">{{ excu_text(t) }}</el-tag>
							</template>
						</el-table-column>
						<el-table-column label="执行时间" align="center" prop="executeTime" />
						<el-table-column label="起止日期" align="center">
							<template #default="scope">
								<div class="col_layout" style="align-items: center">
									<div>{{ scope.row.planDatetimeStart }}</div>
									<div style="margin: 10px 0">~</div>
									<div>{{ scope.row.planDatetimeEnd }}</div>
								</div>
							</template>
						</el-table-column>
						<el-table-column label="状态" align="center">
							<template #default="scope">
								<el-tag :type="scope.row.status ? 'success' : 'danger'">{{ scope.row.status ? '启动' : '停止' }}</el-tag>
							</template>
						</el-table-column>
					</template>
					<!-- 条件场景 -->
					<template v-if="table.type === 3">
						<el-table-column label="状态" align="center">
							<template #default="scope">
								<el-tag :type="scope.row.status ? 'success' : 'danger'">{{ scope.row.status ? '启动' : '停止' }}</el-tag>
							</template>
						</el-table-column>
						<el-table-column label="条件类型" align="center">
							<template #default="scope">
								<div>{{ conditiom_text(scope.row.sceneConditionParamVOS) }}</div>
							</template>
						</el-table-column>
					</template>

					<el-table-column fixed="right" label="操作" align="center" width="300">
						<template #default="scope">
							<div class="row_layout">
								<el-button v-if="table.type === 1" @click="excu_scene(scope.row)" type="success" size="medium">执行</el-button>
								<el-button v-if="table.type !== 1" @click="start_stop(scope.row)" :type="scope.row.status ? 'danger' : 'success'" size="medium">
									{{ scope.row.status ? '停止' : '启动' }}
								</el-button>
								<el-button @click="edit_scene('edit', scope.row)" type="primary" size="medium">编辑</el-button>
								<el-button @click="edit_scene('del', scope.row)" type="primary" size="medium">删除</el-button>
							</div>
						</template>
					</el-table-column>
				</template>
			</mytable>
		</div>
		<!-- 弹窗 -->
		<el-dialog id="scene_form" v-model="form.show" title="场景规则" style="position: relative" v-loading="form.loading">
			<div class="col_layout">
				<div class="body flex_grow">
					<el-form :model="form.data" label-width="auto" size="default">
						<el-form-item label="场景名称" prop="name" required :show-message="false">
							<el-input v-model="form.data.name" />
						</el-form-item>

						<el-form-item label="执行方式" prop="method" required :show-message="false">
							<el-select v-model="form.data.method" :disabled="form.ban">
								<el-option v-for="item in form.methods" :label="item.name" :value="item.val" />
							</el-select>
						</el-form-item>
						<!-- 自动执行 -->
						<template v-if="form.data.method === 2">
							<el-form-item label="执行日期" prop="date_range" required :show-message="false">
								<el-date-picker v-model="form.data.date_range" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" />
							</el-form-item>

							<el-form-item label="执行时间" prop="start_time" required :show-message="false">
								<el-time-picker v-model="form.data.start_time" />
							</el-form-item>

							<el-form-item label="执行周期" prop="cycle" required :show-message="false">
								<el-select v-model="form.data.cycle" multiple placeholder="每周执行">
									<el-option v-for="item in form.weeks" :label="item.name" :value="item.val" />
								</el-select>
							</el-form-item>
						</template>
						<!-- 条件执行 -->
						<template v-if="form.data.method === 3">
							<el-form-item label="条件类型" prop="condition_type" required :show-message="false">
								<el-select v-model="form.data.condition_type">
									<el-option label="场所活动开始前" :value="0"></el-option>
									<el-option label="场所活动结束后" :value="1"></el-option>
								</el-select>
							</el-form-item>

							<el-form-item :label="form.condition_type ? '结束后' : '开始前'" prop="time_unit" :show-message="false">
								<div class="row_layout">
									<el-input-number size="small" v-model="form.data.condition_time" :step="1" :min="0" step-strictly></el-input-number>
									<el-select v-model="form.data.condition_unit" size="small" style="width: 80px; margin-left: 20px">
										<el-option v-for="item in form.units" :label="item.name" :value="item.val"></el-option>
									</el-select>
								</div>
							</el-form-item>
						</template>
						<!-- 传感器 -->
						<template v-if="form.data.method === 4">
							<el-form-item label="阈值" :show-message="false" required>
								<div class="threshold_box">
									<div class="list_box flex_grow">
										<div class="title flex_shrink">
											<span v-for="text in form.threshold_titles">{{ text }}</span>
										</div>

										<div class="scroll">
											<div class="box" v-for="(item, index) in form.data.threshold" :key="index">
												<div class="header" @click="select_server(item)">
													<el-icon class="icon" v-show="!item.check"><ArrowRight /></el-icon>
													<el-icon class="icon" v-show="item.check"><ArrowDown /></el-icon>

													<span class="text_ellipsis" :title="item.id" style="justify-self: start">{{ item.id }}</span>
													<span class="text_ellipsis" :title="item.name">{{ item.name }}</span>
													<el-select v-model="item.type" size="mini" style="width: 100px">
														<el-option label="全部与" :value="true"></el-option>
														<el-option label="全部或" :value="false"></el-option>
													</el-select>
												</div>

												<div v-show="item.check">
													<div class="row_box row_layout" v-for="item2 in item.condition">
														<div>{{ item2.name }}</div>

														<el-select v-model="item2.ct" size="mini" style="width: 100px">
															<el-option v-for="op in form.operators" :key="op.value" :label="op.label" :value="op.value" />
														</el-select>

														<el-input v-model="item2.value" clearable size="mini" style="width: 100px" />
													</div>
												</div>

												<div v-show="item.check" class="bg2 bg_img"></div>
											</div>
										</div>
									</div>

									<!-- 功能按钮 -->
									<div class="buttons flex_shrink col_layout">
										<img class="icon flex_shrink button" @click="threshold_tool(0)" :src="threshold_button_img('添加')" />
										<img class="icon flex_shrink" @click="threshold_tool(1)" :style="threshold_button_style()" :src="threshold_button_img('删除')" />
									</div>
								</div>
							</el-form-item>
						</template>
						<!-- 服务列表 -->
						<div class="server_box flex_shrink">
							<div class="list_box">
								<div class="title flex_shrink">
									<span v-for="text in form.titles">{{ text }}</span>
								</div>

								<div class="scroll">
									<div class="server" v-for="(item, index) in form.data.servers" :key="index" @click="select_server(item)">
										<span class="text_ellipsis" :title="item.configName">{{ item.configName }}</span>
										<span class="text_ellipsis" :title="item.deviceName">{{ item.deviceName }}</span>
										<span class="text_ellipsis" :title="item.placeName">{{ item.placeName }}</span>
										<!-- <span>{{ item.delay }}</span> -->
										<div v-show="item.check" class="bg2 bg_img"></div>
									</div>
								</div>
							</div>
							<!-- 功能按钮 -->
							<div class="buttons flex_shrink col_layout">
								<img class="icon flex_shrink" v-for="(img, index) in form.button_light" :src="button_img(img, index)" :style="button_style(index)" @click="server_tool(index)" />
							</div>
						</div>
					</el-form>
				</div>

				<div class="row_layout flex_shrink" style="justify-content: center; margin-top: 20px">
					<el-button type="primary" @click="save_scene">保存</el-button>
					<el-button @click="form.show = false">取消</el-button>
				</div>
			</div>
		</el-dialog>
		<!-- 场所设备列表弹窗 -->
		<div class="popover" v-if="devices.show">
			<div class="place_box" v-loading="devices.loading">
				<div class="head flex_shrink">智慧设备</div>

				<div v-if="devices.list.length" class="scroll" style="padding-left: 20px">
					<div v-for="place in devices.list">
						<div class="place_box2 row_layout" @click="select_place(place)">
							<el-icon class="icon" v-show="devices.place_id != place.id">
								<ArrowRight />
							</el-icon>
							<el-icon class="icon" v-show="devices.place_id == place.id">
								<ArrowDown />
							</el-icon>
							<span class="text">{{ place.placeName }}</span>
						</div>
						<div style="padding-left: 20px" v-show="devices.place_id == place.id">
							<div class="device_box row_layout" v-for="device in place.devices">
								<span class="text text_ellipsis" :title="device.deviceName">
									{{ device.deviceName }}
								</span>

								<el-button class="flex_shrink" size="mini" round @click.stop="set_config(device, place)">配置</el-button>
							</div>
						</div>
					</div>
				</div>
				<div v-show="!devices.list.length" class="center">无设备</div>

				<div class="foot flex_shrink">
					<el-button @click="devices.show = false">关闭</el-button>
				</div>
			</div>
		</div>
		<!-- 服务配置弹窗 -->
		<div class="popover" v-if="servers.show">
			<div class="server_box2">
				<div class="head flex_shrink">可选服务</div>

				<div class="search flex_shrink row_layout">
					<el-checkbox class="flex_shrink" :indeterminate="servers.isIndeterminate" v-model="servers.checkAll" @change="server_checkall">全选</el-checkbox>
				</div>

				<div class="scroll">
					<div class="row_layout" v-for="server in servers.list">
						<el-checkbox class="flex_shrink" v-model="server.check" @change="select_server2(null)"></el-checkbox>

						<span class="text text_ellipsis" @click="select_server2(server)" :title="server.configName">{{ server.configName }}</span>

						<!-- <div class="row_layout">
							<div>延迟</div>
							<el-input v-model="server.delay" style="width: 100px" />
							<div>秒</div>
						</div> -->
					</div>
				</div>

				<div class="foot flex_shrink">
					<el-button @click="server_submit" type="primary">确定</el-button>
					<el-button @click="servers.show = false">取消</el-button>
				</div>
			</div>
		</div>
		<!-- 延迟配置 -->
		<div class="popover" v-if="delay.show">
			<div class="server_box3">
				<div class="head flex_shrink">延迟设置</div>

				<div class="scroll">
					<div class="row_layout" v-for="server in delay.list">
						<span class="text text_ellipsis flex_shrink" :title="server.configName">
							{{ server.configName }}
						</span>

						<div class="row_layout">
							<span style="color: #05050b">延迟</span>

							<el-input v-model="server.delay" style="width: 60px" size="small"></el-input>

							<span style="color: #05050b">秒</span>
						</div>
					</div>
				</div>

				<div class="foot flex_shrink">
					<el-button @click="delay_submit" type="primary">确定</el-button>
					<el-button @click="delay.show = false">取消</el-button>
				</div>
			</div>
		</div>
		<!-- 传感器条件设置弹窗 -->
		<div class="popover" v-if="threshold.show">
			<div class="server_box2">
				<div class="head flex_shrink">设置条件</div>
				<!-- 按钮 -->
				<div class="search flex_shrink row_layout">
					<el-button @click="add_condition" icon="Plus">添加条件</el-button>

					<el-select v-model="threshold.is_and" style="width: 100px; margin-left: 30px">
						<el-option label="全部与" :value="true"></el-option>
						<el-option label="全部或" :value="false"></el-option>
					</el-select>
				</div>
				<!-- 列标题 -->
				<div class="set_condition flex_shrink">
					<div>绑定属性</div>
					<div>选择条件</div>
					<div>阈值</div>
				</div>
				<!-- 条件列表 -->
				<div class="scroll">
					<div class="set_condition" v-for="(item1, index) in threshold.list">
						<el-select v-model="item1.config_id" placeholder="请选择" size="small">
							<el-option v-for="item2 in threshold.select_list" :key="item2.id" :label="item2.configName" :value="item2.id"> </el-option>
						</el-select>

						<el-select v-model="item1.operator" placeholder="条件" size="small" style="width: 100px">
							<el-option v-for="op in form.operators" :key="op.value" :label="op.label" :value="op.value"></el-option>
						</el-select>

						<el-input v-model="item1.value" clearable size="small" style="width: 100px"></el-input>

						<el-button @click="del_device_condition(index)" type="danger" icon="Delete" circle size="small" />
					</div>
				</div>

				<div class="foot flex_shrink">
					<el-button @click="threshold_submit" type="primary">确定</el-button>
					<el-button @click="threshold.show = false">取消</el-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import myform from '@/components/表单组件/表单组件.vue';
import mytable from '@/components/通用表格组件/通用表格组件.vue';
import api from '@/api/设备管控相关页面/用户_场景设置';
import { 消息 } from '@/常用方法.js';

onMounted(async () => {
	let dom = document.querySelector('.body');
	table.value.height = dom.clientHeight - 50 - 64; // 减去组件头部按钮行高 以及 分页行高
	// 查询场景列表
	get_scene_list(1);
});

const search_dom = ref(); // 搜索栏组件实例
const loading = ref(false); // 加载遮罩
// 搜索配置
const search_config = ref([
	{
		type: 'select',
		label: '状态',
		prop: 'status',
		dict: 'biz_scene_status',
		disabled: true,
	},
	{
		type: 'daterange',
		label: '创建时间',
		prop: 'createTime',
	},
	{
		type: 'input',
		label: '场景名称',
		prop: 'sceneName',
	},
]);
// 搜索按钮 或 切页查询 场景列表
const get_scene_list = async (params) => {
	let body = {};
	switch (typeof params) {
		case 'object':
			// 如果是点搜索 则解析传入参数
			if (params.createTime) {
				body.createdStartTime = params.createTime[0];
				body.createdEndTime = params.createTime[1];
			}
			for (let key in params) {
				if (key !== 'createTime') {
					body[key] = params[key];
				}
			}
			break;
		case 'number':
			// 如果是切页 改变当前页
			table.value.page.cur = params;
			break;
	}
	loading.value = true;
	// 添加常驻查询参数
	let res = await api.get_scene_list({
		pageNum: table.value.page.cur,
		pageSize: table.value.page.size,
		sceneType: table.value.type,
		...body,
	});
	loading.value = false;
	table.value.data.total = res?.total;
	if (res?.data) {
		for (let val of res?.data) {
			val.excu_list = JSON.parse(val.executePeriodDays);
		}
		table.value.data.data = res?.data;
	}
};
// 切换场景类型
const change_scene_type = async (value) => {
	search_config.value[0].disabled = value === 1;
	// 重新从第一页查
	table.value.page.cur = 1;
	// 手动触发搜索事件
	// search_dom.value.handleQuery();
	// 切换场景类型 重置数据 搜索
	search_dom.value.resetQuery();
};
// 重置按钮
const resetQuery = () => {
	get_scene_list(1);
};
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
	// 场景选项
	type_options: [
		{ label: '手动场景', value: 1 },
		{ label: '自动场景', value: 2 },
		{ label: '条件场景', value: 3 },
	],
	type: 1, // 场景类型
});
// 场所设备弹窗
const devices = ref({
	show: false,
	list: [],
	loading: false,
	place_id: '', //选中的场所
	event_type: '', // 正在操作的是阈值还是服务
});
// 启停场景
const start_stop = async (row) => {
	loading.value = true;
	if (row.status) {
		// 当前状态开启 则执行停止操作
		await api.stop_scene([row.id]);
	} else {
		await api.start_scene([row.id]);
	}
	loading.value = false;
	消息('执行成功', 'success');
	get_scene_list(table.value.page.cur);
};
// 新增、编辑、删除场景
const edit_scene = async (tag, data) => {
	switch (tag) {
		case 'del':
			loading.value = true;
			let res = await api.delete_scene(data.id);
			loading.value = false;
			if (res) {
				消息('删除成功', 'success');
				get_scene_list(table.value.page.cur);
			}
			break;
		case 'add':
			form.value.show = true;
			// 重置数据
			form.value.data.name = '';
			form.value.data.method = 2;
			form.value.data.date_range = '';
			form.value.data.start_time = '';
			form.value.data.cycle = [];
			form.value.data.condition_type = '';
			form.value.data.condition_time = 0;
			form.value.data.condition_unit = 13;
			form.value.data.threshold = [];
			form.value.data.servers = [];
			form.rule_id = '';
			break;
		case 'edit':
			form.value.show = true;
			form.rule_id = data.id;
			form.value.data.name = data.sceneName;
			form.value.data.method = data.sceneType;
			// 分类别取值
			switch (data.sceneType) {
				case 2:
					form.value.data.date_range = [new Date(data.planDatetimeStart), new Date(data.planDatetimeEnd)];
					form.value.data.start_time = new Date(`2024/10/10 ${data.executeTime}`);
					form.value.data.cycle = JSON.parse(data.executePeriodDays);
					break;
				case 3:
					form.value.data.condition_type = data.sceneConditionParamVOS[0].preTriggerEventTime === null ? 1 : 0;
					form.value.data.condition_time = form.value.data.condition_type ? data.sceneConditionParamVOS[0].afterTriggerEventTime : data.sceneConditionParamVOS[0].preTriggerEventTime;
					form.value.data.condition_unit = data.sceneConditionParamVOS[0].triggerEvenTimeUnit;
					break;
				case 4:
					form.value.data.threshold = data.scenePropertyDeviceVos.map((e) => ({
						id: e.deviceId,
						type: e.andTriggerTag,
						condition: e.scenePropertyParam.map((e2) => ({
							id: e2.sceneProductConfigId,
							name: e2.sceneProductConfigVo.configName,
							ct: e2.triggerOperator,
							value: e2.triggerValue,
						})),
						name: e.deviceName,
					}));
					break;
			}
			form.value.data.servers = data.deviceCommandVOS.map((e) => ({
				deviceId: e.deviceId,
				placeId: e.placeId,
				id: e.sceneProductConfigId,
				delay: e.delayExecuteMillis,
				configName: e.sceneProductConfigVo.configName,
				deviceName: e.deviceName,
				placeName: e.placeName || '',
			}));
			break;
	}
};
// 执行周期文字
const excu_text = (d) => {
	switch (d) {
		case 2:
			return '周一';
		case 3:
			return '周二';
		case 4:
			return '周三';
		case 5:
			return '周四';
		case 6:
			return '周五';
		case 7:
			return '周六';
		case 1:
			return '周日';
	}
};
// 条件场景类型文字
const conditiom_text = (data) => {
	if (!data) {
		return '';
	}
	let pre = '';
	let time = '';
	let unit = '';
	if (data[0].preTriggerEventTime) {
		pre = '场所活动开始前';
		time = data[0].preTriggerEventTime;
	} else if (data[0].afterTriggerEventTime) {
		pre = '场所活动结束后';
		time = data[0].afterTriggerEventTime;
	}
	switch (data[0].triggerEvenTimeUnit) {
		case 10:
			unit = '小时';
			break;
		case 12:
			unit = '分钟';
			break;
		case 13:
			unit = '秒';
			break;
		case 14:
			unit = '毫秒';
			break;
	}
	return `${pre} ${time} ${unit}`;
};
// 执行手动场景
const excu_scene = async (row) => {
	loading.value = true;
	let { head } = await api.excu_scene(row.id);
	loading.value = false;
	消息('执行成功');
	get_scene_list(table.value.page.cur);
};
// 场景表单
const form = ref({
	show: false,
	ban: false, // 是否禁用一些组件
	loading: false,
	data: {
		name: '', // 场景名
		method: 2, // 执行方式
		date_range: '', // 时间范围
		start_time: '', // 执行时间
		cycle: [], // 执行周期
		condition_type: '', // 条件类型
		condition_time: 0, // 条件时间
		condition_unit: 13, // 条件单位
		threshold: [], // 阈值列表
		servers: [], // 服务列表
	},
	// 执行方式选项
	methods: [
		{ name: '自动执行', val: 2 },
		{ name: '手动执行', val: 1 },
		{ name: '条件执行', val: 3 },
		{ name: '传感器', val: 4 },
	],
	// 执行周期选项
	weeks: [
		{ name: '周一', val: 2 },
		{ name: '周二', val: 3 },
		{ name: '周三', val: 4 },
		{ name: '周四', val: 5 },
		{ name: '周五', val: 6 },
		{ name: '周六', val: 7 },
		{ name: '周日', val: 1 },
	],
	// 条件时间单位
	units: [
		{ name: '秒', val: 13 },
		{ name: '分钟', val: 12 },
		{ name: '小时', val: 10 },
		{ name: '毫秒', val: 14 },
	],
	// 阈值 条件
	operators: [
		{ label: '大于', value: '>' },
		{ label: '小于', value: '<' },
		{ label: '等于', value: '==' },
		{ label: '大于等于', value: '>=' },
		{ label: '小于等于', value: '<=' },
	],
	// 服务列表标题
	titles: ['配置名称', '设备名称', '场所名称'],
	// 传感器列表标题
	threshold_titles: ['设备id', '设备名称', '关联方式'],
	// 服务按钮
	button_light: [
		{ ban: api.get_img_file('icon1.png'), enable: api.get_img_file('icon2.png') },
		{ ban: api.get_img_file('icon3.png'), enable: api.get_img_file('icon4.png') },
		{ ban: api.get_img_file('icon5.png'), enable: api.get_img_file('icon6.png') },
		// { ban: api.get_img_file('icon7.png'), enable: api.get_img_file('icon8.png') },
		{ ban: api.get_img_file('icon9.png'), enable: api.get_img_file('icon10.png') },
	],
});
// 保存场景规则
function save_scene() {
	if (!form.value.data.name) {
		消息('场景名称不能为空', 'error');
		return;
	}
	// 根据执行方式分类验证
	switch (form.value.data.method) {
		case 2:
			// 自动执行
			if (!form.value.data.date_range) {
				消息('执行日期不能为空', 'error');
				return;
			}
			if (!form.value.data.start_time) {
				消息('执行时间不能为空', 'error');
				return;
			}
			if (!form.value.data.cycle.length) {
				消息('执行周期不能为空', 'error');
				return;
			}
			break;
		case 3:
			// 条件执行
			if (typeof form.value.data.condition_type == 'string') {
				消息('条件类型不能为空', 'error');
				return;
			}
			break;
		case 4:
			// 传感器
			if (!form.value.data.threshold.length) {
				消息('阈值不能为空', 'error');
				return;
			}
			// 列表中可重新设置值 所以也要验证
			for (let val of form.value.data.threshold) {
				for (let val2 of val.condition) {
					if (!val2.value) {
						消息('设备条件值不能为空', 'error');
						return;
					}
				}
			}
			break;
	}
	// 所有都要验证服务列表
	if (!form.value.data.servers) {
		消息('执行配置不能为空', 'error');
		return;
	}
	// 总延迟不能超过300秒
	let total_delay = 0;
	for (let val of form.value.data.servers) {
		total_delay += Number(val.delay || 0);
	}
	if (total_delay > 300) {
		消息('总延迟不能超过300秒', 'error');
		return;
	}
	// 发送数据请求
	let data = {
		sceneName: form.value.data.name,
		sceneType: form.value.data.method,
		deviceCommandBos: form.value.data.servers.map((e) => ({
			// delayExecuteMillis: e.delay * 1000,
			deviceId: e.deviceId,
			placeId: e.placeId,
			sceneProductConfigId: e.id,
		})),
	};
	if (form.value.data.method == 2) {
		let st = form.value.data.date_range[0];
		let et = form.value.data.date_range[1];
		data.planDatetimeStart = `${st.getFullYear()}-${st.getMonth() + 1}-${st.getDate()} 00:00:00`;
		data.planDatetimeEnd = `${et.getFullYear()}-${et.getMonth() + 1}-${et.getDate()} 23:59:59`;
		data.executeTime = form.value.data.start_time.toString().split(' ')[4];
		data.executePeriodDays = JSON.stringify(form.value.data.cycle);
	} else if (form.value.data.method == 3) {
		data.sceneConditionParamBos = [
			{
				triggerEvenTimeUnit: form.value.data.condition_unit,
			},
		];
		switch (form.value.data.condition_type) {
			case 0:
				data.sceneConditionParamBos[0].preTriggerEventTime = form.value.data.condition_time;
				break;
			case 1:
				data.sceneConditionParamBos[0].afterTriggerEventTime = form.value.data.condition_time;
				break;
		}
	} else if (form.value.data.method == 4) {
		data.scenePropertyDeviceBOs = form.value.data.threshold.map((e) => ({
			deviceId: e.id,
			andTriggerTag: e.type,
			scenePropertyParam: e.condition.map((e2) => ({
				sceneProductConfigId: e2.id,
				triggerOperator: e2.ct,
				triggerValue: e2.value,
			})),
		}));
	}
	if (form.rule_id) {
		data.id = form.rule_id;
	}
	form.value.loading = true;
	api.scene_save(data);
	form.value.loading = false;
	消息(`保存场景成功`, 'success');
	form.value.show = false;
	get_scene_list(1);
}
// 阈值 工具栏
const threshold_tool = (type) => {
	switch (type) {
		case 0:
			devices.value.show = true;
			devices.value.place_id = '';
			devices.value.event_type = '传感器';
			get_place_device();
			break;
		case 1:
			for (let index = 0; index < form.value.data.threshold.length; index++) {
				// 如果是勾选项 删除当前项 并回退一格
				if (form.value.data.threshold[index].check) {
					form.value.data.threshold.splice(index, 1);
					index--;
				}
			}
			break;
	}
};
// 阈值按钮样式
const threshold_button_img = (type) => {
	switch (type) {
		case '添加':
			return api.get_img_file('icon2.png');
		case '删除':
			for (let val of form.value.data.threshold) {
				if (val.check) {
					return api.get_img_file('icon10.png');
				}
			}
			return api.get_img_file('icon9.png');
	}
};
// 阈值按钮样式
const threshold_button_style = () => {
	for (let val of form.value.data.threshold) {
		if (val.check) {
			return { cursor: 'pointer' };
		}
	}
	return { cursor: 'not-allowed' };
};
// 总服务列表 选中服务项
function select_server(obj) {
	obj.check = obj.check ? false : true;
}
// 按钮颜色切换
function button_img(img, index) {
	if (!index) {
		// 第一个按钮 加号 始终保持点亮的状态
		return img.enable;
	}
	for (let val of form.value.data.servers) {
		if (val.check) {
			return img.enable;
		}
	}
	return img.ban;
}
// 按钮点击样式
function button_style(index) {
	if (!index) {
		return { cursor: 'pointer' };
	}
	for (let val of form.value.data.servers) {
		if (val.check) {
			return { cursor: 'pointer' };
		}
	}
	return { cursor: 'not-allowed' };
}
// 工具栏
function server_tool(index) {
	switch (index) {
		case 0:
			devices.value.show = true;
			devices.value.place_id = '';
			devices.value.event_type = '服务';
			get_place_device();
			break;
		case 1:
			let index = 0;
			for (let val of form.value.data.servers) {
				// 第一项不能往前移 前一项是勾选不能往前移
				if (index && !form.value.data.servers[index - 1].check && val.check) {
					form.value.data.servers.splice(index, 1);
					form.value.data.servers.splice(index - 1, 0, val);
				}
				index++;
			}
			break;
		case 2:
			for (let index = form.value.data.servers.length - 1; index >= 0; index--) {
				// 最后一项不能下移 后一项勾选不能下移
				if (index < form.value.data.servers.length - 1 && !form.value.data.servers[index + 1].check && form.value.data.servers[index].check) {
					let t = form.value.data.servers[index];
					form.value.data.servers.splice(index, 1);
					form.value.data.servers.splice(index + 1, 0, t);
				}
			}
			break;
		// case 3:
		// 	delay.value.show = true;
		// 	delay.value.list = [];
		// 	for (let val of form.value.data.servers) {
		// 		if (val.check) {
		// 			delay.value.list.push(JSON.parse(JSON.stringify(val)));
		// 		}
		// 	}
		// 	break;
		// case 4:
		case 3:
			for (let index = 0; index < form.value.data.servers.length; index++) {
				// 如果是勾选项 删除当前项 并回退一格
				if (form.value.data.servers[index].check) {
					form.value.data.servers.splice(index, 1);
					index--;
				}
			}
			break;
	}
}
// 查询场所设备
async function get_place_device() {
	devices.value.loading = true;
	let res = await api.get_place_device();
	devices.value.loading = false;
	if (res) {
		devices.value.list = res;
	}
}
// 点击展开折叠场所
function select_place(place) {
	devices.value.place_id = devices.value.place_id == place.id ? -1 : place.id;
}
// 配置按钮
async function set_config(device, place) {
	devices.value.loading = true;
	// 共用场所设备弹窗 区分是 服务 还是 传感器
	if (devices.value.event_type == '服务') {
		servers.value.checkAll = false;
		servers.value.isIndeterminate = false;
		let res = await api.get_scene_config(device.id, 1);
		devices.value.loading = false;
		if (!res.length) {
			消息('设备无服务', 'error');
			return;
		}
		servers.value.show = true;
		for (let val of res) {
			val.check = false;
			val.delay = '';
			val.deviceName = device.deviceName; //外层显示用
			val.deviceId = device.id; // 保存时用
			val.placeName = place.placeName; //外层显示
			val.placeId = place.id; // 保存时用
		}
		servers.value.list = res;
	} else if (devices.value.event_type == '传感器') {
		devices.id = device.id;
		devices.name = device.deviceName;
		let res = await api.get_scene_config(device.id, 2);
		devices.value.loading = false;
		if (!res.length) {
			消息('无可选项', 'error');
			return;
		}
		threshold.value.show = true;
		// 查询可选值
		threshold.value.select_list = res;
		threshold.value.list = [];
	}
}
// 服务配置窗
const servers = ref({
	show: false,
	isIndeterminate: false,
	checkAll: false,
	list: [], // 当前设备所有服务列表
});
// 全选服务
function server_checkall(value) {
	servers.value.isIndeterminate = false;
	for (let val of servers.value.list) {
		val.check = value;
	}
}
// 单个设备 勾选服务
function select_server2(obj) {
	if (obj) {
		obj.check = !obj.check;
	}
	let scount = 0;
	let scheck = 0;
	for (let val of servers.value.list) {
		scount++;
		if (val.check) {
			scheck++;
		}
	}
	servers.value.checkAll = scount == scheck;
	servers.value.isIndeterminate = scheck > 0 && scheck < scount;
}
// 服务列表提交 将勾选项添加到总勾选服务列表
function server_submit() {
	let result = false;
	for (let val of servers.value.list) {
		if (val.check) {
			result = true;
			break;
		}
	}
	if (!result) {
		消息('至少勾选一个服务', 'error');
		return;
	}
	// for (let val of servers.value.list) {
	// 	if (val.check && (!Number(val.delay) || isNaN(Number(val.delay)))) {
	// 		result = false;
	// 		break;
	// 	}
	// }
	// if (!result) {
	// 	消息('延迟时间必须为数字', 'error');
	// 	return;
	// }
	for (let val of servers.value.list) {
		if (val.check) {
			val.check = false;
			form.value.data.servers.push(val);
		}
	}
	servers.value.show = false;
}
// 延迟窗口
const delay = ref({
	show: false,
	list: [],
});
// 延迟及服务设置保存
function delay_submit() {
	for (let val of delay.value.list) {
		if (isNaN(Number(val.delay))) {
			消息('延迟只能输入数字', 'error');
			return;
		}
		if (Number(val.delay) > 30) {
			消息('延迟最多30！', 'error');
			return;
		}
	}
	for (let val of delay.value.list) {
		for (let val2 of form.value.data.servers) {
			if (val2.id == val.id) {
				val2.delay = val.delay;
				break;
			}
		}
	}
	delay.value.show = false;
}
const threshold = ref({
	show: false,
	select_list: [], // 设置条件可选服务
	list: [], // 条件列表
	is_and: false, // 设备条件全部与/或
});
// 添加条件
function add_condition() {
	threshold.value.list.push({
		config_id: '', // 绑定的配置id
		operator: '',
		value: '',
	});
}
// 删除设备条件
function del_device_condition(index) {
	threshold.value.list.splice(index, 1);
}
// 阈值提交
function threshold_submit() {
	// 不能为空
	if (!threshold.value.list.length) {
		消息('条件不能为空', 'error');
		return;
	}
	for (let val of threshold.value.list) {
		if (!val.config_id || !val.operator || !val.value) {
			消息('必须填写条件', 'error');
			return;
		}
	}
	let list = [];
	for (let val of threshold.value.list) {
		for (let val2 of threshold.value.select_list) {
			if (val.config_id == val2.id) {
				let t = {
					name: val2.configName,
					id: val2.id,
					ct: val.operator,
					value: val.value,
				};
				list.push(t);
				break;
			}
		}
	}
	// 添加到外层列表中
	form.value.data.threshold.push({
		id: devices.id,
		name: devices.name,
		type: threshold.value.is_and,
		condition: list,
		check: false,
	});
	threshold.value.show = false;
}
</script>

<style lang="less" scoped>
#index {
	width: 100%;
	height: 100%;
	background: #fff;
	display: flex;
	flex-direction: column;
	> .body {
		flex-grow: 1;
	}
}
.row_layout {
	display: flex;
	align-items: center;
}
.col_layout {
	display: flex;
	flex-direction: column;
}
.flex_grow {
	flex-grow: 1;
}
.flex_shrink {
	flex-shrink: 0;
}
.button {
	position: relative;
	z-index: 10;
	cursor: pointer;
	&:active {
		transform: scale(0.9);
	}
}
.bg_img {
	width: 100%;
	height: 100%;
	position: absolute;
	z-index: -1;
	left: 0;
	top: 0;
}
.text_ellipsis {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}
.scroll {
	flex-grow: 1;
	overflow-x: hidden;
	padding-right: 4px;
}
.center {
	display: flex;
	align-items: center;
	justify-content: space-evenly;
	flex-wrap: wrap;
	align-content: center;
	position: relative;
	z-index: 10;
}
// 场景表单
#scene_form {
	width: 80vw;
	height: 80vh;
	max-width: 80vw;
	max-height: 80vh;
	position: fixed;
	> .col_layout {
		height: 100%;
		overflow: hidden;
		> .body {
			overflow: auto;
		}
	}
}
// 阈值框
.threshold_box {
	min-height: 200px;
	max-height: 310px;
	overflow: hidden;
	border: 1px solid;
	border-radius: 6px;
	display: flex;
	width: 100%;
	> .buttons {
		padding: 22px 24px 0 24px;
		> .icon {
			width: 80px;
			height: 36px;
			margin-bottom: 22px;
		}
	}
	> .list_box {
		overflow: hidden;
		border-right: 1px solid;
		display: flex;
		flex-direction: column;
		> .title {
			padding: 20px 4px 20px 0;
			border-bottom: 1px solid;
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			justify-items: center;
			align-items: center;
			line-height: normal;
		}
		.box {
			z-index: 10;
			position: relative;
			cursor: pointer;
			> .header {
				height: 50px;
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				justify-items: center;
				align-items: center;
				overflow: hidden;
				position: relative;
				padding-left: 20px;
				> .icon {
					position: absolute;
					left: 0;
					top: 50%;
					transform: translateY(-50%);
				}
			}
			.row_box {
				padding: 10px 0 10px 60px;
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				align-items: center;
				overflow: hidden;
				&:first-of-type {
					padding-top: 0;
				}
			}
			> .bg2 {
				background: rgba(86, 158, 248, 0.1);
			}
		}
	}
}
// 服务框
.server_box {
	max-height: 310px;
	overflow: hidden;
	border: 1px solid;
	border-radius: 6px;
	display: flex;
	> .list_box {
		flex-grow: 1;
		border-right: 1px solid;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		> .title {
			padding: 20px 4px 20px 0;
			border-bottom: 1px solid;
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			justify-items: center;
		}
		.server {
			z-index: 10;
			height: 50px;
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			justify-items: center;
			align-items: center;
			overflow: hidden;
			position: relative;
			cursor: pointer;
			> .text_ellipsis {
				max-width: 100%;
			}
			> .bg1 {
				background: rgba(255, 255, 255, 0.1);
			}
			> .bg2 {
				background: rgba(86, 158, 248, 0.1);
			}
		}
	}
	> .buttons {
		padding: 22px 24px 0 24px;
		> .icon {
			width: 80px;
			height: 36px;
			margin-bottom: 22px;
		}
	}
}
.popover {
	position: fixed;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.2);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 20000;
	> .place_box {
		width: 50%;
		height: 80%;
		border-radius: 10px;
		border: 1px solid #454c59;
		background: #fff;
		display: flex;
		flex-direction: column;
		> .head {
			padding: 20px 30px;
			border-radius: 10px 10px 0 0;
			background: #53b0ff;
			color: #05050b;
		}
		> .search {
			padding: 0 20px;
			> .search_input {
				flex-grow: 1;
				margin-left: 90px;
			}
		}
		> .center {
			flex-grow: 1;
		}
		> .foot {
			padding: 16px 0;
			align-self: center;
		}
		.place_box2 {
			height: 50px;
			cursor: pointer;
			color: #05050b;
			.icon {
				font-size: 14px;
				margin-right: 10px;
			}
			.text {
				font-size: 14px;
			}
		}
		.device_box {
			height: 40px;
			> .flex_shrink {
				margin-right: 10px;
			}
			.text {
				font-size: 14px;
				margin-right: auto;
				cursor: pointer;
			}
		}
	}
	> .server_box2 {
		width: 40%;
		height: 70%;
		border-radius: 10px;
		border: 1px solid;
		display: flex;
		flex-direction: column;
		background: #fff;
		border-color: #454c59;
		> .head {
			padding: 20px 30px;
			border-radius: 10px 10px 0 0;
			background: #53b0ff;
			color: #05050b;
		}
		> .search {
			padding: 0 20px;
		}
		> .scroll > .row_layout {
			padding: 10px 20px;
			.flex_shrink {
				margin-right: 10px;
			}
		}
		.text {
			font-size: 14px;
			flex-grow: 1;
			color: #05050b;
		}
		> .foot {
			padding: 16px 0;
			align-self: center;
		}
	}
	> .server_box3 {
		width: 50%;
		height: 80%;
		border-radius: 10px;
		border: 1px solid;
		display: flex;
		flex-direction: column;
		background: #fff;
		border-color: #454c59;
		> .head {
			padding: 20px 30px;
			border-radius: 10px 10px 0 0;
			background: #53b0ff;
			color: #05050b;
		}
		> .scroll > .row_layout {
			padding: 10px 20px;
			border-bottom: 1px solid #bcccda;
			> .text {
				font-size: 14px;
				width: 200px;
				color: #05050b;
			}
		}
		> .foot {
			padding: 16px 0;
			align-self: center;
		}
	}
}
// 设置条件弹窗标题
.set_condition {
	padding: 10px 20px;
	display: grid;
	grid-template-columns: repeat(3, 1fr) 60px;
	align-items: center;
	justify-items: center;
	color: #05050b;
}
</style>
