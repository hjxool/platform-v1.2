new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		// 搜索栏
		search: {
			status: '', // 启停状态
			status_options: [
				{ label: '启用中', value: 1 },
				{ label: '已停用', value: 0 },
			],
			time_range: [], // 检索范围
      keyword: '', // 搜索
      
		},
		// 列表
		table: {
			h: 0, // 表格最大高度
		},
	},
	mounted() {
		this.get_token();
		this.resize();
	},
	methods: {
		// 窗口大小变化
		resize() {
			let dom = document.querySelector('.body');
			this.table.h = dom.clientHeight;
		},
		// 查询场景数据
		get_scene_list() {},
	},
});
