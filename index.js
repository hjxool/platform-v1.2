new Vue({
	el: '#index',
	mounted() {
		this.path = 候工链接.replace(/dlc/i, 'dlc2');
		this.get_type();
		this.turn_to();
	},
	methods: {
		get_type() {
			console.log(location.search);
			let temp = location.search.substring(1).split('&');
			for (let val of temp) {
				let t = val.split('=');
				if (t[0].match(/^type$/) != null) {
					this.router = t[1];
				}
			}
		},
		turn_to() {
			let path;
			switch (this.router) {
				case 'model':
					path = 'model';
					break;
				case 'DeviceStatus':
					path = 'status';
					break;
				case 'RulesEngine':
					path = 'rules';
					break;
				case 'RulesEngine2':
					path = 'device_rule';
					break;
				case 'OperationAndMaintenance':
					path = 'door';
					break;
				case 'device_manage':
					path = 'device_manage';
					break;
				case 'device_monitor':
					path = 'device_monitor';
					break;
				case 'MeetingReservation':
					path = 'meeting_reserve';
					break;
				case 'ConferenceRoomUsageStatistics':
					path = 'calendar';
					break;
				case 'IoTControl':
					path = 'IoTControl';
					break;
				case 'yinxiangxitong':
					path = 'other/音响系统';
					break;
				case 'yitiji':
					path = 'other/一体机';
					break;
				case 'yitiji2':
					path = 'other/一体机2';
					break;
				case 'DS-CS310M':
					path = 'other/DS-CS310M';
					break;
				case 'power_supply':
					location.href = `../dlc3/电源/index.html${location.search}`;
					return;
				case 'power_supply2':
					location.href = `../智慧设备/电源设备2/index.html${location.search}`;
					return;
				case 'visual_edit':
					location.href = `../后台管理系统/设备可视化编辑器/index.html${location.search}`;
					return;
				case 'UpgradeManagement':
					path = 'upgradeManager';
					break;
				case 'ADKXX':
					path = 'other/功放设备';
					break;
				case 'AKEXX':
					path = 'other/时序器';
					break;
				case 'ProjectOverviewOffline':
					path = 'offlinePage';
					break;
				case 'Visual_Preview':
					path = 'visual_editor';
					break;
				case 'MeetingList':
					path = 'meetingList';
					break;
				case 'meetingDetail':
					path = 'meetingDetail';
					break;
				case 'MyBooking':
					path = 'todayMeeting';
					break;
				case 'public_material':
					path = 'material';
					break;
				case 'material2':
					path = 'material2';
					break;
				case 'role_add_user':
				case 'department_add_user':
				case 'search_user':
					path = 'add_person';
					break;
				case 'ResourceCenter':
					path = 'ResourceCenter';
					break;
				case 'screen_management':
					path = 'screen_management';
					break;
				case 'playlist':
					path = 'playlist';
					break;
				case 'playlist_edit':
					path = 'playlist_edit';
					break;
				case 'Edit_timed_broadcast_added':
				case 'Added_edit_fire_alarm':
					path = 'edit_time_broadcast';
					break;
				case 'scene_popup':
					path = 'scene_popup';
					break;
				case 'CentralizedControlPanel':
					path = 'visual_editor2';
					break;
				case 'app_add_person':
					location.href = `./移动端/add_person/index.html${location.search}`;
					return;
				case 'wirelessmircophone':
					path = 'wirelessmircophone';
					break;
				case 'screen_scheduling':
					path = 'screen_scheduling';
					break;
				case 'screen_control':
					path = 'screen_control';
					break;
				case 'qt_visual':
					path = 'qt_visual';
					break;
				case 'user_scene':
					path = 'user_scene';
					break;
				default:
					location.href = `${this.path}${location.search}`;
					return;
			}
			location.href = `./${path}/index.html${location.search}`;
		},
	},
});
