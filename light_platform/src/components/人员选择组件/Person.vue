<template>
	<div id="index" v-loading="loading">
		<div class="left">
			<!-- 仅人员有搜索 -->
			<el-input v-show="search_type.select === 1" v-model="form.search" @change="get_data('search', search_type.select)" clearable prefix-icon="Search" />

			<div class="options" v-show="!search_type.select">
				<div class="box button" v-for="item in search_type.options" @click="get_data('option', item.value)">
					<div class="bg center">
						<el-icon v-show="item.value == 1"><Avatar /></el-icon>
						<el-icon v-show="item.value == 2"><OfficeBuilding /></el-icon>
					</div>
					<span class="font">{{ item.label }}</span>
				</div>
			</div>

			<div class="list_box col_layout" v-if="search_type.select">
				<div v-show="form.path.length === 1 || search_type.select === 1" class="box1 flex_shrink row_layout">
					<el-icon class="icon button" @click="search_type.select = 0">
						<ArrowLeft />
					</el-icon>
					<span class="icon text">
						{{ search_type.select == 1 ? '按人员选' : '按架构选' }}
					</span>
				</div>

				<div v-if="search_type.select === 2" class="box2 flex_shrink row_layout">
					<div class="row_layout" v-for="(path, index) in form.path">
						<span class="text button" @click="path_back(index)">
							{{ path.name }}
						</span>
						<el-icon v-show="index != form.path.length - 1" style="font-size: 16px">
							<ArrowRight />
						</el-icon>
					</div>
				</div>

				<div class="scroll">
					<div class="person" v-for="item in form.dep_list">
						<div v-show="!item.check" @click="select_item(item)" class="icon1 flex_shrink"></div>
						<div v-show="item.check" @click="select_item(item)" class="icon2 flex_shrink center">
							<el-icon class="icon3"><Check /></el-icon>
						</div>

						<div class="name text_ellipsis" @click="select_item(item)" :title="item.name">
							{{ item.name }}
						</div>
						<el-button class="button" :disabled="item.check" @click.stop="get_data('forward', 2, item)" style="margin: 0 10px" type="text"> 下级 </el-button>
					</div>

					<div v-if="form.dep_list.length && form.list.length" class="line_between"></div>

					<div class="person" v-for="item in form.list">
						<div v-show="!item.check" @click="select_item(item)" class="icon1 flex_shrink"></div>
						<div v-show="item.check" @click="select_item(item)" class="icon2 flex_shrink center">
							<el-icon class="icon3"><Check /></el-icon>
						</div>

						<div class="name text_ellipsis" @click="select_item(item)" :title="item.name">
							{{ item.name }}
						</div>
					</div>
				</div>

				<el-pagination
					v-if="search_type.select === 1"
					class="paging"
					@current-change="get_data('paging', search_type.select, $event)"
					layout="prev, pager, next"
					:total="form.total"
					:page-size="form.page_size"
					:current-page="form.cur_page"
				/>
			</div>
		</div>
		<div class="right">
			<span class="margin1"> 已选择（ {{ form.select_list.length }} ） </span>

			<div class="scroll">
				<div class="person flex_shrink" v-for="(item, index) in form.select_list" @click="del_select(index)">
					<span class="name text_ellipsis" :title="item.name">{{ item.name }}</span>

					<el-icon><Close /></el-icon>
				</div>
			</div>

			<div class="submit">
				<el-button @click="$emit('close')" style="margin-right: 20px">取消</el-button>
				<el-button @click="submit" type="primary">确定</el-button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, watch } from 'vue';
import api from '@/api/用户权限相关页面/人员检索';
import { getOneList } from "@/api/会议系统相关页面/会议预约弹框.js";
// 接收传入的数据
const props = defineProps(['list']);
// 声明触发的事件
const $emit = defineEmits(['submit']);
// 变量
const search_type = ref({
	select: 0, // 当前筛选类型
	options: [
		{ label: '按人员选', value: 1 },
		{ label: '按部门选', value: 2 },
	],
});
const form = ref({
	search: '', // 搜索框
	cur_page: 1, // 当前页
	page_size: 20, // 单页数量
	total: 0, // 总数
	list: [], // 人员列表
	select_list: [], // 已选列表
	path: [], // 层级路径
	dep_list: [], // 部门列表
});
// 将传入的人员列表接收 在后续点进类型搜索时会自动回显
if (Array.isArray(props.list)) {
	form.value.select_list = props.list;
}
// 同时设置监听 当传入数据变化时 重新赋值
watch(
	() => props.list,
	(newValue) => {
		// 接收新数据说明重新打开组件 刷新状态
		search_type.select = 0;
		if (Array.isArray(newValue)) {
			form.value.select_list = newValue;
		}
	}
);
const loading = ref(false); // 加载
// 方法
// 根据当前类型搜索
async function get_data(tag, type, ...params) {
	// 如果是从导航页跳转过来 清空搜索栏
	if (tag === 'option') {
		form.value.search = '';
	}
	switch (type) {
		case 1:
			// 按人员
			if (tag === 'search' || tag === 'option') {
				form.value.cur_page = 1;
			} else {
				form.value.cur_page = params[0];
			}
			let body = {
				pageNum: form.value.cur_page,
				pageSize: form.value.page_size,
			};
			if (form.value.search) {
				body.searchValue = form.value.search;
			}
			loading.value = true;
			let res = await api.get_user_list(body);
			loading.value = false;
			if (res) {
				form.value.dep_list = []; // 查人员要将部门列表清空
				search_type.value.select = type;
				form.value.total = res.total;
				form.value.list = res.data.map((e) => ({
					check: form.value.select_list.some((e2) => e2.id === e.userId),
					id: e.userId, // 统一格式在已选栏显示
					name: e.nickName,
					type: 'person', // 分类标识 用于控制样式
				}));
			}
			break;
		case 2:
			// 按部门
			// let cur_list;
			let dep = [];
			let user = [];
			if (tag === 'option') {
				// 首次检索
				loading.value = true;
				let root_id = await api.get_root_dep_id();
				let res = await api.get_dep_list({
					currentDeptId: root_id ? Number(root_id) : 100,
				});
				loading.value = false;
				if (res) {
					search_type.value.select = type;
					dep = res.sysDeptVOList;
					user = res.sysUserVOList;
					form.value.path = [
						{
							name: '湖山电器',
							id: root_id ? Number(root_id) : 100,
						},
					];
					// 首次查询的初始数据要保存下来 方便后续过滤显示
					// let t2 = format_list(res);
					// cur_list = JSON.parse(JSON.stringify(t2[0].child));
					// 初始化路径
					// let t = t2[0];
					// form.value.path = [
					// 	{
					// 		name: t.name,
					// 		id: t.child,
					// 	},
					// ];
				}
			}
			//#region
			// else if (tag === 'search') {
			// 	// 因为搜索只检索当前层级 即path最后一级
			// 	// 先深拷贝保存副本
			// 	let list = JSON.parse(JSON.stringify(form.value.path[form.value.path.length - 1].list));
			// 	if (form.value.search) {
			// 		cur_list = list.filter((e) => e.indexOf(form.value.search) !== -1);
			// 	} else {
			// 		// 当清除搜索 备份还原
			// 		cur_list = list;
			// 	}
			// }
			//#endregion
			else if (tag === 'back') {
				loading.value = true;
				let res = await api.get_dep_list({
					currentDeptId: form.value.path[params[0]].id,
				});
				loading.value = false;
				if (res) {
					dep = res.sysDeptVOList;
					user = res.sysUserVOList;
					form.value.path.splice(params[0] + 1);
				}
				// cur_list = JSON.parse(JSON.stringify(form.value.path[params[0]].list));
				// 删除回退位置后的路径
				// form.value.path.splice(params[0] + 1);
			} else if (tag === 'forward') {
				loading.value = true;
				let res = await api.get_dep_list({
					currentDeptId: params[0].id,
				});
				loading.value = false;
				if (res) {
					dep = res.sysDeptVOList;
					user = res.sysUserVOList;
					form.value.path.push({
						name: params[0].name,
						id: params[0].id,
					});
				}

				// cur_list = JSON.parse(JSON.stringify(params[0].child));
				// form.value.path.push({
				// 	name: params[0].name,
				// 	list: params[0].child,
				// });
			}
			form.value.dep_list = dep.map((e) => ({
				check: form.value.select_list.some((e2) => e2.id === e.deptId),
				id: e.deptId,
				name: e.deptName,
				type: 'dep',
			}));
			form.value.list = user.map((e) => ({
				check: form.value.select_list.some((e2) => e2.id === e.userId),
				id: e.userId,
				name: e.nickName,
				type: 'person',
			}));
			//#region
			// 回显当前层级勾选项
			// for (let val of cur_list) {
			// 	val.check = form.value.select_list.some((e) => e.id === val.id);
			// }
			// form.value.list = cur_list;
			//#endregion
			break;
	}
}
// 构造展示列表
function format_list(source) {
	let list = [];
	for (let val of source) {
		let t = {
			name: val.label,
			id: val.id,
			check: false,
			type: 'dep',
		};
		if (val.children?.length) {
			t.child = format_list(val.children);
		}
		list.push(t);
	}
	return list;
}
// 路径回退
function path_back(index) {
	// 如果是当前展示的组织 则不能再查
	let t = form.value.path;
	if (index !== t.length - 1) {
		get_data('back', 2, index);
	}
}
// 勾选或取消勾选
function select_item(obj) {
	if (obj.check) {
		for (let i = 0; i < form.value.select_list.length; i++) {
			if (form.value.select_list[i].id === obj.id) {
				form.value.select_list.splice(i, 1);
				break;
			}
		}
	} else {
		// 勾选部门时要去掉child
		form.value.select_list.push({
			name: obj.name,
			id: obj.id,
			type: obj.type,
		});
	}
	obj.check = !obj.check;
}
// 已选列表中删除
function del_select(index) {
	let obj = form.value.select_list[index];
	if (obj.type === 'dep') {
	} else if (obj.type === 'person') {
	}
	let list;
	switch (obj.type) {
		case 'dep':
			list = form.value.dep_list;
			break;
		case 'person':
			list = form.value.list;
			break;
	}
	for (let val of list) {
		if (val.id === obj.id) {
			val.check = false;
			break;
		}
	}
	// for (let val of form.value.list) {
	//   if (val.id === obj.id) {
	//     val.check = false;
	//     break;
	//   }
	// }
	form.value.select_list.splice(index, 1);
}
// 提交
async function submit () {
	let hasDept = false;
	const sysDeptVOList = [];
	const sysUserVOList = [];
	let list = JSON.parse(JSON.stringify(form.value.select_list))
	list.forEach((item) => {
    if (item.type === "dep") {
      hasDept = true;
      sysDeptVOList.push({
        deptId: item.id,
        deptName: item.name,
		type:item.type
      });
    }

    if (item.type === "person") {
      sysUserVOList.push({
        userId: item.id,
        nickName: item.name,
		type:item.type
      });
    }
  });

  // 存在部门则调用接口
  if (hasDept) {
    const data = {
      sysDeptVOList,
      sysUserVOList,
    };
    const res = await getOneList(data);
	list = res.map((item)=>({
		name: item.nickName,
		id: item.userId,
		type:"person"
	}))
  } else {
    list = list.map((item) => ({
		name: item.name,
		id: item.id,
		type:item.type
	}));
  }
	$emit(
		'submit',
		list
	);
}
</script>

<style lang="less" scoped>
@import '@/assets/css/common/hj_common.css';

#index {
	width: 100%;
	height: 100%;
	display: grid;
	grid-template-columns: 1fr 1fr;
}
.left {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding: 10px;
	border-right: 1px solid #e2e4e5;
	> .options {
		margin: 20px 0 20px 10px;
		display: flex;
		flex-wrap: wrap;
		> .box {
			display: flex;
			flex-direction: column;
			align-items: center;
			margin-bottom: 20px;
			margin-right: 20px;
			> .bg {
				width: 40px;
				height: 40px;
				border-radius: 10px;
				background-color: rgba(105, 105, 105, 0.2);
				margin-bottom: 12px;
				font-size: 16px;
			}
			> .font {
				font-size: 14px;
			}
		}
	}
	> .list_box {
		flex-grow: 1;
		overflow: hidden;
		> .box1 {
			margin: 10px 0;
			> .icon {
				font-size: 14px;
				font-weight: bold;
			}
			> .text {
				margin: 0 auto;
			}
		}
		> .box2 {
			flex-wrap: wrap;
			align-content: start;
			margin-bottom: 10px;
			.text {
				border-radius: 6px;
				padding: 5px;
				font-size: 16px;
				&:hover {
					background: rgba(105, 105, 105, 0.2);
				}
			}
		}
		> .scroll {
			flex-grow: 1;
			padding-right: 10px;
			overflow: auto;
			> .person {
				padding: 6px 8px;
				display: flex;
				align-items: center;
				// overflow: hidden;
				cursor: pointer;
				position: relative;
				color: black;
				&:hover {
					background-color: rgba(105, 105, 105, 0.2);
				}
				> .icon1 {
					width: 20px;
					height: 20px;
					border: 1px solid;
					border-radius: 6px;
				}
				> .icon2 {
					width: 20px;
					height: 20px;
					background: #007fff;
					border-radius: 6px;
					> .icon3 {
						font-size: 12px;
						color: #fff;
					}
				}
				> .name {
					padding-left: 12px;
					flex-grow: 1;
				}
			}
			> .line_between {
				width: 100%;
				height: 6px;
				background-color: #696969;
				border-radius: 4px;
				margin: 6px 0;
			}
		}
		> .paging {
			align-self: center;
			padding: 20px 0;
		}
	}
}
.right {
	padding: 10px;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	> .margin1 {
		margin-bottom: 10px;
	}
	> .scroll {
		flex-grow: 1;
		padding-right: 10px;
		overflow: auto;
		display: flex;
		flex-wrap: wrap;
		align-content: start;
		> .person {
			background-color: rgba(105, 105, 105, 0.2);
			padding: 6px 10px;
			margin: 6px 0 6px 8px;
			display: flex;
			align-items: center;
			overflow: hidden;
			border-radius: 6px;
			font-size: 14px;
			cursor: pointer;
			> .name {
				margin-right: 10px;
			}
		}
	}
	> .submit {
		padding-top: 10px;
		align-self: end;
	}
}
</style>
