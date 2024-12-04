let roomDetail = {
	template: `
    <div id="room_datail" class="col_layout">
      <div class="head">{{detail.roomName}}</div>

      <div class="body flex_grow col_layout">
        <div class="content flex_grow">
          <div class="img">
            <img :src="detail.photoUrl" class="bg_img">
          </div>

          <div class="detail">
            <div class="title margin">会议室类型</div>
            <div class="text margin" v-if="detail.type===0">办公室管理会议室</div>
            <div class="text margin" v-if="detail.type===1">学院/部门管理会议室对内</div>
            <div class="text margin" v-if="detail.type===2">学院/部门管理会议室开放</div>
            <div class="row_layout margin">
              <div class="title">会议室容量:</div>
              <div class="text">{{detail.num || '0'}}</div>
            </div>
            <div class="title margin">功能定位</div>
            <div class="text margin">{{detail.functionalPosition || '空'}}</div>
            <div class="title margin">会议室设备</div>
            <div class="text margin">{{detail.conferencingEquipment || '空'}}</div>
          </div>
        </div>

        <div class="time flex_shrink">
          <div class="time_box">
            <div :class="[t==1?'gray':'']" v-for="t in list"></div>
          </div>

          <div class="text_box row_layout">
            <div v-for="t in 10">{{t+8}}:00</div>
          </div>
        </div>
      </div>

      <div class="foot">
        <van-button @click="jump_to" type="info">预约会议</van-button>
      </div>
    </div>
  `,
	props: ['detail', 'token', 'list'],
	methods: {
		// 跳转会议预约
		jump_to() {
			window.location.href = `../meetingReserve/index.html?token=${this.token}&id=${this.detail.id}`;
		},
	},
};
