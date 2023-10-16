let url = `${我是接口地址}/`;
let data_url = `${url}api-portal/place/tenant/device/analyse`;
let search_device_list_url = `${url}api-portal/place/user/findDeviceByType`;
let search_place_list_url = `${url}api-portal/place/user/findAll`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			scroll_num: 5, //限制滚动显示的告警条数
			statistic_window: false, //统计数字弹窗
			statistic_title: '', //统计弹窗标题
			page_size: 10, //查询条数
			table_h: 0, //弹窗列表高度
			total: 0, //统计弹窗总数
		},
		online_num: 0, //在线设备数
		offline_num: 0, //离线设备数
		normal_num: 0, //正常数
		abnormal_num: 0, //异常数
		alert_num: 0, //设备告警数
		alert_list: [], //实时告警列表
		place_num: 0, //场所数量
		statistic_window_list: [], //统计弹窗列表
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		// if (!sessionStorage.hushanwebmenuTree) {
		// 	await new Promise((success) => {
		// 		this.request('get', limits_url, this.token, (res) => {
		// 			success();
		// 			if (res.data.head.code !== 200) {
		// 				return;
		// 			}
		// 			sessionStorage.hushanwebmenuTree = JSON.stringify(res.data.data.menuTree);
		// 		});
		// 	});
		// }
		// // 解析权限树
		// let limits;
		// for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
		// 	if (val.name === '湖山智慧设备') {
		// 		for (let val2 of val.subMenus) {
		// 			if (val2.name === '项目总览') {
		//         limits = val2.subMenus;
		// 				break;
		// 			}
		// 		}
		// 		break;
		// 	}
		// }
		// this.config.timing_show = this.is_element_show(limits, '定时发布');

		// 初始化图表实例
		let dom = document.querySelectorAll('.body');
		for (let i = 1; i <= 4; i++) {
			this[`echart${i}`] = echarts.init(dom[i - 1]);
		}
		window.addEventListener('resize', this.resize);
		this.get_data();
	},
	methods: {
		// 解析权限树
		// is_element_show(source, key) {
		// 	for (let val of source) {
		// 		if (val.name === key) {
		// 			return true;
		// 		}
		// 	}
		// 	return false;
		// },
		// 视窗大小改变根元素字体大小
		resize() {
			let dom = document.documentElement;
			let w = dom.clientWidth;
			if (w >= 1000 && w <= 1920) {
				let t = w / 1920;
				let fontsize = Math.ceil(t * 16);
				dom.style.fontSize = `${fontsize}px`;
			} else if (w < 1000) {
				dom.style.fontSize = `10px`;
			} else if (w > 1920) {
				dom.style.fontSize = `16px`;
			}
			// 更新图表
			for (let i = 1; i <= 4; i++) {
				this[`echart${i}`].resize();
			}
			if (this.html.statistic_window) {
				let dom2 = document.querySelector('.statistic_body');
				this.html.table_h = dom2.offsetHeight;
			}
		},
		// 初始化图表
		init_echarts(type) {
			let option;
			switch (type) {
				case 1:
					option = {
						legend: {
							bottom: '5%',
							right: '10%',
							orient: 'vertical',
							textStyle: {
								color: '#fff',
							},
						},
						series: [
							{
								type: 'pie',
								radius: ['40%', '70%'],
								center: ['30%', '50%'],
								label: {
									show: false,
									position: 'center',
								},
								emphasis: {
									label: {
										show: true,
										fontSize: '20',
										fontWeight: 'bold',
										color: '#fff',
										formatter: '{c}',
									},
								},
								data: [
									{ value: this.online_num, name: '在线设备' },
									{ value: this.offline_num, name: '离线设备' },
								],
							},
						],
						color: ['#FAFF75', '#01B4FF'],
					};
					break;
				case 2:
					option = {
						legend: {
							bottom: '5%',
							right: '10%',
							orient: 'vertical',
							textStyle: {
								color: '#fff',
							},
						},
						series: [
							{
								type: 'pie',
								radius: [0, '70%'],
								center: ['30%', '50%'],
								label: {
									show: false,
									position: 'outside',
								},
								emphasis: {
									label: {
										show: true,
										fontSize: '20',
										fontWeight: 'bold',
										color: '#fff',
										formatter: '{c}',
									},
								},
								labelLine: {
									show: true,
									lineStyle: {
										color: 'rgba(255,255,255,0.5)',
									},
								},
								data: [
									{ value: this.normal_num, name: '联检正常' },
									{ value: this.abnormal_num, name: '联检异常' },
								],
							},
						],
						color: ['#025AFF', '#D15465'],
					};
					break;
				case 3:
					option = {
						tooltip: {
							trigger: 'item',
							formatter: '{b} : {c}',
						},
						legend: {
							orient: 'vertical',
							right: '5%',
							bottom: '5%',
							textStyle: {
								color: '#fff',
							},
							type: 'scroll',
						},
						series: [
							{
								type: 'funnel',
								left: 'left',
								width: '80%',
								minSize: '0%',
								maxSize: '100%',
								sort: 'descending',
								orient: 'horizontal',
								label: {
									show: false,
									position: 'inside',
								},
								itemStyle: {
									borderWidth: 0,
								},
								emphasis: {
									label: {
										show: false,
									},
								},
								data: this.product_type_list,
							},
						],
					};
					break;
				case 4:
					option = {
						tooltip: {
							trigger: 'axis',
							axisPointer: {
								type: 'line',
								lineStyle: {
									type: 'solid',
									width: 3,
									color: '#fff',
								},
							},
							formatter: '{b}：{c}',
						},
						xAxis: {
							type: 'category',
							boundaryGap: false,
							data: this.alert_time_list,
							splitLine: {
								show: true,
								lineStyle: {
									color: '#B1B0BB',
								},
							},
							name: '（时间）',
							nameLocation: 'end',
							nameTextStyle: {
								color: '#B1B0BB',
							},
							axisTick: {
								show: false,
							},
							axisLabel: {
								color: '#B1B0BB',
							},
							axisLine: {
								lineStyle: {
									color: '#B1B0BB',
									width: 4,
								},
							},
						},
						yAxis: {
							type: 'value',
							splitLine: {
								show: true,
								lineStyle: {
									color: '#B1B0BB',
								},
							},
							name: '（频率）',
							nameLocation: 'end',
							nameTextStyle: {
								color: '#B1B0BB',
							},
							axisLabel: {
								color: '#B1B0BB',
							},
							axisLine: {
								show: true,
								lineStyle: {
									color: '#B1B0BB',
									width: 4,
								},
							},
						},
						series: [
							{
								data: this.alert_num_list,
								type: 'line',
								areaStyle: {
									color: {
										type: 'linear',
										x: 0,
										y: 0,
										x2: 0,
										y2: 1,
										colorStops: [
											{
												offset: 0,
												color: 'rgba(30,144,255,1)', // 0% 处的颜色
											},
											{
												offset: 1,
												color: 'rgba(30,144,255,.4)', // 100% 处的颜色
											},
										],
									},
								},
								lineStyle: {
									color: '#1684F0',
								},
								symbolSize: 10,
							},
						],
					};
					break;
			}
			this[`echart${type}`].setOption(option);
		},
		// 获取页面数据
		get_data() {
			this.request('get', data_url, this.token, (res) => {
				console.log('数据', res);
				if (res.data.head.code != 200) {
					return;
				}
				let data = res.data.data;
				this.place_num = data.placeNum;
				this.online_num = data.onlineDeviceNum;
				this.offline_num = data.offlineDeviceNum;
				this.alert_num = data.alarmDeviceNum;
				this.normal_num = data.onlineCheckNormal || 0;
				this.abnormal_num = data.onlineCheckError || 0;
				// 只取一定数量的告警消息
				let length = data.alarmDeviceInfo.length < this.html.scroll_num ? data.alarmDeviceInfo.length : this.html.scroll_num;
				this.alert_list = [];
				for (let i = 0; i < length; i++) {
					let t = data.alarmDeviceInfo[i].split(',');
					let t2 = {
						// time: t[3].substring(3),
						content: `类型：${t[0]}, ${t[1]}`,
						type: t[0].substring(2),
					};
					this.alert_list.push(t2);
				}
				// 产品类型统计
				this.product_type_list = [];
				let array2 = [
					{ deviceNum: 10, productName: '产品1' },
					{ deviceNum: 20, productName: '产品2' },
				];
				let array = data.productanalyseList || array2;
				for (let val of array) {
					let t = {
						value: val.deviceNum || 0,
						name: val.productName || '空',
					};
					this.product_type_list.push(t);
				}
				this.alert_time_list = data.date;
				this.alert_num_list = data.allDeviceAlarmCount;
				for (let i = 1; i <= 4; i++) {
					this.init_echarts(i);
				}
			});
		},
		// 跳转到其他页面
		trun_to_other_page(device_obj) {
			let message = {
				type: 'jump',
				name: '设备告警',
				condition_deviceId: device_obj.id,
				// 200001告警 200002离线
				condition_bizType: this.html.statistic_title == '离线设备' ? '200002' : '200001',
			};
			window.parent.postMessage(message);
		},
		// 获取统计数据
		get_statistic_list(params) {
			// 字符串则是第一次点开 根据类型匹配查询方法 数字则是分页查询 用同一种查询方法
			if (typeof params == 'string') {
				this.html.statistic_title = params;
				switch (params) {
					case '场所数量':
						this.request('get', search_place_list_url, this.token, (res) => {
							console.log('场所', res);
							if (res.data.head.code != 200) {
								return;
							}
							this.html.statistic_window = true;
							this.statistic_window_list = res.data.data;
							this.$nextTick(() => {
								// 此时数据已经挂载上去 父元素被element组件撑大了 获取到的就不是正确的高度
								// 父元素设置为溢出隐藏后 高度就在弹窗显示时固定了
								let dom2 = document.querySelector('.statistic_body');
								this.html.table_h = dom2.offsetHeight;
							});
						});
						return;
					default:
						this.request_data = {};
						this.url = search_device_list_url;
						this.request_data.condition = {
							// placeType: 0,
							type: params == '在线设备' ? 1 : params == '离线设备' ? 2 : 3,
						};
						this.request_data.pageNum = 1;
						this.request_data.pageSize = this.html.page_size;
						this.func = (res) => {
							console.log('统计', res);
							if (res.data.head.code != 200) {
								return;
							}
							this.html.statistic_window = true;
							this.statistic_window_list = res.data.data.data;
							this.html.total = res.data.data.total;
							this.$nextTick(() => {
								let dom2 = document.querySelector('.statistic_body');
								this.html.table_h = dom2.offsetHeight;
							});
						};
						break;
				}
			} else {
				this.request_data.pageNum = params;
			}
			this.request('post', this.url, this.token, this.request_data, this.func);
		},
	},
});
