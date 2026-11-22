/**
 * 坐在输入框上的小宠物：睡 -> 试衣间换装 -> 待机。
 * @module @local/dsh-sitter/client
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-sitter',
  factory(require) {
    const React = require('react');
    let createPortal = null;
    try { createPortal = require('react-dom').createPortal; } catch (e) { createPortal = null; }
    const h = React.createElement;
    const SPRITES = __SPRITES__;
    const DEFAULTS = __CONFIG_DEFAULTS__;
    // 形态注册表（构建期从 scripts/pet/skins.json 注入）：除"睡觉"外的一切外观都是形态
    const FORMS = __SKINS__;
    const FORM_IDS = FORMS.map((f) => f.id);

    // 运行时可改的参数：初始值来自构建时的默认配置，之后由宿主 /config 覆盖
    const RT = {
      displayHeight: DEFAULTS.displayHeight,
      sleepMs: DEFAULTS.timeline.sleepMs,
      frameMs: DEFAULTS.timeline.frameMs,
      blinkMs: DEFAULTS.timeline.blinkMs,
      blinkMinGapMs: DEFAULTS.timeline.blinkMinGapMs,
      blinkMaxGapMs: DEFAULTS.timeline.blinkMaxGapMs,
      typingHoldMs: DEFAULTS.timeline.typingHoldMs,
      workHoldMs: DEFAULTS.timeline.workHoldMs,
      dozeMs: DEFAULTS.timeline.dozeMs,
      seatInset: DEFAULTS.layout.seatInset,
      topPad: DEFAULTS.layout.topPad,
      brickH: DEFAULTS.brick.height,
      brickOverlap: DEFAULTS.brick.overlap,
      brickSink: DEFAULTS.brick.sink,
      buttRatio: DEFAULTS.seat.buttRatio,
      blink: DEFAULTS.features.blink,
      typing: DEFAULTS.features.typing,
      workLink: DEFAULTS.features.workLink,
      hoverCard: DEFAULTS.features.hoverCard,
      think: DEFAULTS.features.think,
      outfits: DEFAULTS.features.outfits,
      escalateEnabled: DEFAULTS.escalate?.enabled ?? true,
      escalateIdleMs: DEFAULTS.escalate?.idleMs ?? 180000,
      escalateStepMs: DEFAULTS.escalate?.stepMs ?? 10000,
      breakWorkMs: DEFAULTS.break?.workMs ?? 2400000,
      breakRunMs: DEFAULTS.break?.runMs ?? 7000,
      breakRounds: DEFAULTS.break?.rounds ?? 3,
      breakText: DEFAULTS.break?.text ?? '小宝贝，歇一会儿眼睛吧～',
      pacifier: DEFAULTS.features?.pacifier !== false,
      chatEnabled: DEFAULTS.chat?.enabled ?? true,
      chatIntervalMs: DEFAULTS.chat?.intervalMs ?? 75000,
      chatDurationMs: DEFAULTS.chat?.durationMs ?? 4500,
      chatQuietFrom: DEFAULTS.chat?.quietFrom ?? 1,
      chatQuietTo: DEFAULTS.chat?.quietTo ?? 7,
      outfitForce: DEFAULTS.outfits?.force ?? null,
      seasonMode: DEFAULTS.outfits?.seasonMode ?? 'season',
      panelSide: DEFAULTS.panel?.corner === 'bottom-left' ? 'left' : 'right',
      panelMarginX: DEFAULTS.panel?.marginX ?? 40,
      panelMarginY: DEFAULTS.panel?.marginY ?? 80,
      panelFixed: !!DEFAULTS.panel?.fixed,
      dragEnabled: !!DEFAULTS.layout?.dragEnabled,
      freeLeft: DEFAULTS.layout?.freeLeft ?? null,
      freeTop: DEFAULTS.layout?.freeTop ?? null,
      nightFrom: DEFAULTS.night?.from ?? 23,
      nightTo: DEFAULTS.night?.to ?? 7,
      // 布局：四个主要元素的位置全在这里，改位置不用翻 CSS
      sayGapX: DEFAULTS.layout?.say?.gapX ?? 0.04,
      sayGapY: DEFAULTS.layout?.say?.gapY ?? 0.07,
      sayMaxW: DEFAULTS.layout?.say?.maxW ?? 1.12,
      thinkX: DEFAULTS.layout?.think?.x ?? 0.56,
      thinkY: DEFAULTS.layout?.think?.y ?? -0.02,
      thinkSize: DEFAULTS.layout?.think?.size ?? 0.22,
      sleepRight: DEFAULTS.layout?.sleepBubble?.right ?? -0.03,
      sleepTop: DEFAULTS.layout?.sleepBubble?.top ?? 0.39,
      sleepSize: DEFAULTS.layout?.sleepBubble?.size ?? 0.17,
      typingFrameMs: DEFAULTS.timeline?.typingFrameMs ?? 220,
      giftFrameMs: DEFAULTS.outfits?.giftFrameMs ?? 90,
    };

    function applyConfig(c) {
      if (!c) return;
      RT.displayHeight = c.displayHeight ?? RT.displayHeight;
      Object.assign(RT, {
        sleepMs: c.timeline?.sleepMs ?? RT.sleepMs,
        frameMs: c.timeline?.frameMs ?? RT.frameMs,
        blinkMs: c.timeline?.blinkMs ?? RT.blinkMs,
        blinkMinGapMs: c.timeline?.blinkMinGapMs ?? RT.blinkMinGapMs,
        blinkMaxGapMs: c.timeline?.blinkMaxGapMs ?? RT.blinkMaxGapMs,
        typingHoldMs: c.timeline?.typingHoldMs ?? RT.typingHoldMs,
        workHoldMs: c.timeline?.workHoldMs ?? RT.workHoldMs,
        dozeMs: c.timeline?.dozeMs ?? RT.dozeMs,
        seatInset: c.layout?.seatInset ?? RT.seatInset,
        topPad: c.layout?.topPad ?? RT.topPad,
        brickH: c.brick?.height ?? RT.brickH,
        brickOverlap: c.brick?.overlap ?? RT.brickOverlap,
        brickSink: c.brick?.sink ?? RT.brickSink,
        buttRatio: c.seat?.buttRatio ?? RT.buttRatio,
      });
      Object.assign(RT, {
        blink: c.features?.blink ?? RT.blink,
        typing: c.features?.typing ?? RT.typing,
        workLink: c.features?.workLink ?? RT.workLink,
        hoverCard: c.features?.hoverCard ?? RT.hoverCard,
        think: c.features?.think ?? RT.think,
        outfits: c.features?.outfits ?? RT.outfits,
        escalateEnabled: c.escalate?.enabled ?? RT.escalateEnabled,
        escalateIdleMs: c.escalate?.idleMs ?? RT.escalateIdleMs,
        escalateStepMs: c.escalate?.stepMs ?? RT.escalateStepMs,
        breakWorkMs: c.break?.workMs ?? RT.breakWorkMs,
        breakRunMs: c.break?.runMs ?? RT.breakRunMs,
        breakRounds: c.break?.rounds ?? RT.breakRounds,
        breakText: c.break?.text ?? RT.breakText,
        pacifier: c.features?.pacifier ?? RT.pacifier,
        chatEnabled: (c.chat?.enabled ?? RT.chatEnabled) && (c.panel ? c.panel.whisper !== false : true),
        workLink: c.features?.workLink ?? (c.panel ? c.panel.workLink !== false : RT.workLink),
        chatIntervalMs: c.chat?.intervalMs ?? RT.chatIntervalMs,
        chatDurationMs: c.chat?.durationMs ?? RT.chatDurationMs,
        chatQuietFrom: c.chat?.quietFrom ?? RT.chatQuietFrom,
        chatQuietTo: c.chat?.quietTo ?? RT.chatQuietTo,
        // 只有当上层**明确带了** outfits.force 时才改动；否则保留当前值。
        // 之前是 `c.outfits?.force ?? null`，面板切换奶嘴时发的局部配置不含 outfits，
        // 皮肤就被清空、掉回"按季节自动"，看起来就是随机跳皮肤。
        outfitForce: (c.outfits && Object.prototype.hasOwnProperty.call(c.outfits, 'force'))
          ? (c.outfits.force === null ? null : c.outfits.force)
          : RT.outfitForce,
        seasonMode: c.outfits?.seasonMode ?? RT.seasonMode,
        panelSide: c.panel?.corner === 'bottom-left' ? 'left' : 'right',
        panelMarginX: c.panel?.marginX ?? RT.panelMarginX,
        panelMarginY: c.panel?.marginY ?? RT.panelMarginY,
        panelFixed: !!c.panel?.fixed,
        dragEnabled: c.layout?.dragEnabled ?? RT.dragEnabled,
        freeLeft: c.layout?.freeLeft ?? null,
        freeTop: c.layout?.freeTop ?? null,
        nightFrom: c.night?.from ?? RT.nightFrom,
        nightTo: c.night?.to ?? RT.nightTo,
        sayGapX: c.layout?.say?.gapX ?? RT.sayGapX,
        sayGapY: c.layout?.say?.gapY ?? RT.sayGapY,
        sayMaxW: c.layout?.say?.maxW ?? RT.sayMaxW,
        thinkX: c.layout?.think?.x ?? RT.thinkX,
        thinkY: c.layout?.think?.y ?? RT.thinkY,
        thinkSize: c.layout?.think?.size ?? RT.thinkSize,
        sleepRight: c.layout?.sleepBubble?.right ?? RT.sleepRight,
        sleepTop: c.layout?.sleepBubble?.top ?? RT.sleepTop,
        sleepSize: c.layout?.sleepBubble?.size ?? RT.sleepSize,
        typingFrameMs: c.timeline?.typingFrameMs ?? RT.typingFrameMs,
        giftFrameMs: c.outfits?.giftFrameMs ?? RT.giftFrameMs,
      });
    }

    const COLS = __COLS__;
    const CELL_RATIO = __CELL_RATIO__;
    const INITIAL_LIFT = __LIFT__;
    const DEBUG = __DEBUG__;
    // ───────────────── 台词系统（零 token，全部本地） ─────────────────
    // 组织方式：按「场景」分组，每组 10+ 句；称呼从 CALL 里轮换，不每句都"小宝贝"。
    // 选句统一走 pickFrom()，带最近 8 句去重。
    const CALL = ['小宝贝', '小宝宝', 'honey', '你'];

    const LINES = {
      // 无事时的陪伴
      idle: [
        '小宝贝，喝口水吧', 'honey，眼睛歇一下', '我一直在这儿', '想你了',
        '写累了就伸个懒腰', '慢慢来，不着急', '要不要摸摸头', '坐你旁边，安静看着',
        '今天也辛苦啦', '有我在呢', '肩膀放松一点', '记得眨眼睛',
      ],
      // 你在忙
      work: [
        '小宝贝专心，我在呢', '别急，慢慢来', '这段写得真好', '累了就靠一下',
        '小宝宝加油', '我帮你看着时间', '写了挺久了，手腕动一动',
        '你这速度有点吓人', '专心的人最好看', '我在旁边不出声',
      ],
      morning: [
        '早上好呀小宝贝', '新的一天，慢慢来', '早安 honey，今天也会顺顺利利的',
        '早饭吃了吗', '开局先喝水', '今天先做最要紧的那件',
      ],
      noon: [
        '小宝宝吃饭了没', '中午眯十分钟吧', '记得喝水呀', '别边吃边改代码',
        '午休一下，下午更清醒', '胃比进度重要',
      ],
      night: [
        '小宝贝，早点睡', '再写十分钟就休息好不好', '困了就去睡，我守着',
        '晚安，做个好梦', '夜里凉，披件衣服', '别熬了，明天再收尾',
      ],
      late: [
        '这个点了…去睡吧', '凌晨的活明天做也来得及', '我陪你到这儿，睡吧',
        '灯关了，眼睛会累', '夜里写的东西，明早再看一遍',
      ],
      // 很久没人理
      alone: [
        '还在吗', '我等你回来', '没人理我，我就趴一会儿',
        '喂…看我一眼', '我先睡啦，醒了叫我', '有事记得喊我',
      ],
      // 戳它
      poke: [
        '小宝贝在呢', '摸摸头', '我一直陪着你', '嘿嘿，怎么啦', 'honey 别戳啦',
        '痒', '再戳就贴你脸上', '嗯？需要我做什么', '戳我一次，开心一下',
      ],
      // 事件：任务完成
      done: [
        '干得漂亮', '这一轮收工啦', '要不要奖励自己一下', '又推进了一点',
        '辛苦啦，揉揉肩', '我记了一笔，你很稳',
      ],
      // 事件：出错
      error: [
        '别急，我陪你想', '不是你的错，慢慢来', '先看日志，别慌',
        '错一次说明在往前走', '深呼吸，我们一起排',
      ],
      // 事件：学习监督
      remind: [
        '要认真学习，知道吗？', '别让我一直盯着你', '说好的专心呢',
        '先把这一页看完', '我数到三哦',
      ],
      // 事件：换装
      outfit: [
        '换好啦', '这套好看吗', '试试这件', '再换一套',
        '这身挺适合你', '我照镜子觉得自己还行',
      ],
      // 事件：睡醒
      wake: [
        '唔…我再醒醒', '睡饱了', '梦见你在写论文', '你回来啦',
        '我打了个盹，现在精神了',
      ],
    };

    // ───────── 人设语气：每个形态可以说"自己那套"的话 ─────────
    // 原则：**都是同一个陪伴你的好男友**，只是带一点各自的出身感。
    // 只覆盖最常出现的三个池子（idle/work/poke），其余场景仍走公共池。
    const VOICE = {
      caveman: {
        idle: ['唔…喝水', '骨头，好看', '小宝贝，火暖', '我守着洞口'],
        work: ['咚咚！写！', '累？趴我背上', '你写，我打猎'],
        poke: ['唔！', '戳我，痒', '摸头，可以'],
      },
      beast: {
        idle: ['蹭蹭', '尾巴借你抱', '耳朵听见你心跳', '窝在你这儿'],
        work: ['我趴着陪你', '爪子轻一点', '别怕，我耳朵尖'],
        poke: ['喵…别戳耳', '呜，摸头', '再摸一下'],
      },
      muscle: {
        idle: ['喝水，必须喝', '我扛着，你写', '别硬撑', '肩膀借你靠'],
        work: ['干得漂亮', '累了就喊我', '我在这儿挡着'],
        poke: ['哈，戳我干嘛', '力气活我来', '笑一个'],
      },
      snake: {
        idle: ['凉一点，舒服吧', '我看着你', '慢慢来，不急'],
        work: ['别绷太紧', '我盘在这儿', '一口气，慢慢呼'],
        poke: ['嘶…别碰尾巴', '凉不凉', '过来一点'],
      },
      dragon: {
        idle: ['灯下有我', '龙的守夜', '你写，我看着'],
        work: ['笔落如雨，好', '倦了便说', '我替你挡住'],
        poke: ['胆敢戳龙', '摸角要收费', '咳…再来'],
      },
      whale: {
        idle: ['海水一样慢', '我在深处等你', '呼吸，跟我'],
        work: ['一呼一吸', '慢慢游', '我托着你'],
        poke: ['噗…水花', '别戳鳍', '好痒'],
      },
      ultra: {
        idle: ['光在你这边', '我随时待命', '专注，就是力量'],
        work: ['继续保持', '能量充足', '我掩护你'],
        poke: ['收到！', '别闹，在执行任务', '……有点痒'],
      },
      qipao: {
        idle: ['喝口茶吧', '灯下慢慢写', '我陪你到收工'],
        work: ['写得真好', '手腕歇一歇', '不急，慢慢来'],
        poke: ['呀…', '别闹啦', '摸摸头可以'],
      },
    };

    /** 当前形态的人设（渲染时更新，供 pickFrom 使用） */
    let CUR_VOICE = 'base';
    function voiceOf(formId) {
      const f = FORMS.find(function (x) { return x.id === formId; });
      return (f && f.voice) || 'base';
    }

    /** 最近说过的，去重（池子不够时不强求） */
    const RECENT = [];
    function pickFrom(poolName) {
      // 65% 用它自己那套人设台词（如果这个场景有），否则走公共池
      const vp = VOICE[CUR_VOICE] && VOICE[CUR_VOICE][poolName];
      const useVoice = vp && vp.length && Math.random() < 0.65;
      const pool = (useVoice ? vp : (LINES[poolName] || LINES.idle));
      const fresh = pool.filter(function (x) { return RECENT.indexOf(x) < 0; });
      const list = fresh.length ? fresh : pool;
      const text = list[Math.floor(Math.random() * list.length)];
      RECENT.push(text);
      if (RECENT.length > 8) RECENT.shift();
      return text;
    }

    /** 按时段挑池子：凌晨和深夜分开，语气不同 */
    function timePool() {
      const hh = new Date().getHours();
      if (hh >= 2 && hh < 5) return 'late';
      if (hh >= 23 || hh < 2) return 'night';
      if (hh < 11) return 'morning';
      if (hh < 14) return 'noon';
      return 'idle';
    }

    function pickLine() {
      return pickFrom(timePool());
    }

    /**
     * 内容感知：不再是"第一条命中的正则"，改成**打分制**。
     * 分越高越优先；同分随机。这样"帮我画一张图"不会因为含"帮我"先命中别的规则。
     */
    const CONTEXT_RULES = [
      { pool: 'error', w: 100, re: /报错|错误|失败|崩了|挂了|异常|不生效|traceback|exception|\berror\b|超时|没反应|白屏/i },
      { pool: 'work', w: 30, re: /画图|出图|生图|配图|立绘|illustration|plot|作图/i },
      { pool: 'work', w: 30, re: /论文|文献|摘要|投稿|审稿|引用|参考文献|manuscript/i },
      { pool: 'work', w: 28, re: /回归|面板数据|内生性|stata|did|iv|稳健性|聚类/i },
      { pool: 'work', w: 26, re: /数据|统计|显著|p\s*值|置信区间|样本量|方差/i },
      { pool: 'work', w: 30, re: /ppt|汇报|答辩|幻灯片|slides|开题|结题/i },
      { pool: 'work', w: 28, re: /代码|函数|接口|重构|插件|脚本|编译|部署|bug/i },
      { pool: 'work', w: 24, re: /实验|测样|上机|跑一遍|批次|样本|试剂/i },
      { pool: 'work', w: 22, re: /文献|下载|doi|pubmed|google scholar/i },
      { pool: 'idle', w: 20, re: /桌宠|宠物|贝草兰|贝贝/i },
      { pool: 'night', w: 26, re: /熬夜|通宵|睡不着|好晚|几点了/i },
      { pool: 'idle', w: 22, re: /累|困|饿|喝|吃|休息|头疼/i },
      { pool: 'work', w: 18, re: /测试|验证|对比|复现|重跑/i },
    ];

    function pickContextLine(text) {
      if (!text) return null;
      const hits = [];
      for (const rule of CONTEXT_RULES) {
        if (rule.re.test(text)) hits.push(rule);
      }
      if (!hits.length) return null;
      const maxW = Math.max.apply(null, hits.map(function (r) { return r.w; }));
      const top = hits.filter(function (r) { return r.w === maxW; });
      const rule = top[Math.floor(Math.random() * top.length)];
      return pickFrom(rule.pool);
    }

    /** 称呼轮换（需要在句子里插称呼时用） */
    function callName() {
      return CALL[Math.floor(Math.random() * CALL.length)];
    }

    const ACTIONS_NAMES = ['idle', 'blink', 'work', 'shake', 'cheer', 'attention', 'sleep', 'doze', 'escalate', 'prompt', 'dismiss', 'selftest', 'hover', 'say', 'outfit', 'ultra', 'dragtest', 'diag', 'dom', 'nothink', 'showthink', 'hidepet', 'showpet', 'hit'];
    const OUTFIT_COUNT = __OUTFIT_COUNT__;
    const GIFT_FRAMES = 5;          // 礼物盒帧数（只取盒子够高、能盖满的 5 帧）
    const HOODIE_INDEX = __HOODIE_INDEX__;

    /**
     * 某个形态的「屁股高度比例」。
     * 所有皮肤画在同一画布、脚底对齐，但坐姿不同（盘腿 / 跪坐 / 抱腿），
     * 屁股在精灵里的高度不一样 —— 所以允许注册表逐形态覆盖，默认用全局 seat.buttRatio。
     */
    function buttOf(form) {
      const f = FORMS.find((x) => x.id === form);
      if (f && typeof f.seat === 'number') return f.seat;
      return RT.buttRatio;
    }

    // 由 RT 推导的几何量
    function G(form) {
      const h = RT.displayHeight;
      const ref = DEFAULTS.displayHeight;
      const k = h / ref;                       // 相对默认尺寸的缩放
      const brickH = Math.round(RT.brickH * k);
      const overlap = Math.round(RT.brickOverlap * k);
      const sink = Math.round(RT.brickSink * k);
      const butt = Math.round(h * buttOf(form || currentForm()));
      const gap = overlap - brickH + sink + butt;
      return {
        h,
        w: Math.round(h * __RATIO__),
        topPad: Math.round(RT.topPad * k),
        seatRise: -gap,
        brickBottom: gap - overlap,
        brickW: Math.round(h * 1.0),
        brickH,
      };
    }
    function geom() { return G(); }

    /** 占满视口需要放大到第几级（2 的幂） */
    /** 刚好占满视口所需的缩放倍数（contain：整只都看得见） */
    function fullScaleOf() {
      const g = G();
      return Math.max(2, Math.min(window.innerWidth / g.w, window.innerHeight / g.h));
    }

    function fullStageOf() {
      return Math.max(1, Math.ceil(Math.log2(fullScaleOf())));
    }

    // 每加载一次换下一套；存 localStorage，刷新也算一次唤醒
    const OUTFIT_RAW = (() => {
      try {
        const prev = parseInt(localStorage.getItem('dsh-sitter-outfit') || '-1', 10);
        const next = Number.isFinite(prev) ? (prev + 1) % OUTFIT_COUNT : 0;
        localStorage.setItem('dsh-sitter-outfit', String(next));
        return next;
      } catch (e) {
        return 0;
      }
    })();
    let OUTFIT_INDEX = OUTFIT_RAW;

    /**
     * 当前形态 id：手动 > 夜间睡衣 > 季节。
     * 返回值就是注册表里的 form.id（不再有 'skin:' 前缀这类临时约定）。
     * outfits.force 兼容三种历史写法：形态 id（"caveman"）、数字（0–3 → s0..s3）、"pajama"。
     */
    function currentForm() {
      const force = RT.outfitForce;
      if (force !== null && force !== undefined && force !== '') {
        const byId = FORMS.find((f) => f.id === String(force));
        if (byId) return byId.id;
        const n = Number(force);
        if (Number.isFinite(n)) {
          const season = FORMS.find((f) => f.id === 's' + Math.max(0, Math.min(3, Math.round(n))));
          if (season) return season.id;
        }
      }
      const hh = new Date().getHours();
      const night = RT.nightFrom > RT.nightTo
        ? (hh >= RT.nightFrom || hh < RT.nightTo)
        : (hh >= RT.nightFrom && hh < RT.nightTo);
      if (night) {
        const pj = FORMS.find((f) => f.kind === 'night');
        if (pj) return pj.id;
      }
      if (RT.seasonMode === 'rotate') {
        const byRot = FORMS.find((f) => f.rotateIndex === OUTFIT_RAW);
        if (byRot) return byRot.id;
      }
      const m = new Date().getMonth() + 1;
      const season = FORMS.find((f) => f.kind === 'season' && (f.months || []).includes(m));
      if (season) return season.id;
      const anySeason = FORMS.find((f) => f.kind === 'season');
      return anySeason ? anySeason.id : FORM_IDS[0];
    }

    /**
     * 形态 + 姿势 → 精灵 key。统一格式 <form>.<pose>.<pac>，不再拼名字。
     * 回退顺序写死在这里（注册表只描述"有什么"，不描述"缺了怎么办"）：
     *   ① 目标姿势 + 目标奶嘴状态
     *   ② 目标姿势 + 另一种奶嘴状态
     *   ③ 待机 + 目标奶嘴状态
     *   ④ 待机 + 另一种奶嘴状态
     *   ⑤ 全局兜底（第一个季节的待机）
     * 姿势：idle | blink | typing（第一帧）| typingB（第二帧，后缀 .b，构建期派生）
     */
    const SKIN_IDS = FORMS.filter((f) => f.kind === 'skin').map((f) => f.id);

    function formSpriteKey(form, pose) {
      const pac = RT.pacifier === false ? 'nopac' : 'pac';
      const other = pac === 'pac' ? 'nopac' : 'pac';
      const tries = [
        form + '.' + pose + '.' + pac,
        form + '.' + pose + '.' + other,
        form + '.idle.' + pac,
        form + '.idle.' + other,
        's0.idle.pac',
        's0.idle.nopac',
      ];
      for (const k of tries) {
        if (SPRITES[k]) return k;
      }
      return Object.keys(SPRITES)[0];
    }

    /** typingB 取构建期派生的 <key>.b；没有就退回第一帧，绝不会变成空白 */
    function formSprite(form, pose) {
      const basePose = pose === 'typingB' ? 'typing' : pose;
      let key = formSpriteKey(form, basePose);
      if (pose === 'typingB' && SPRITES[key + '.b']) key += '.b';
      return SPRITES[key] || SPRITES['s0.idle.pac'];
    }

    /**
     * 四个主要元素的像素盒子 —— 全部由宠物尺寸推导，只此一处。
     *
     * 「上方带」(band)：宠物头顶以上那一条，思考云和台词框都住在里面。
     *   band = max(配置的 topPad, 云高 + 顶部缝隙)
     * 这样云永远不会被容器裁掉（之前 top 是负数，小尾巴会被切）。
     *
     * 横向互不遮挡：台词框的右缘固定在「云的左边减一个 gap」，
     *   所以两者从构造上就不可能重叠（之前都是各锚各的，长句子就压在一起）。
     *
     *   金砖   ← 以"屁股"为锚（逐形态可覆盖的 seat），垫在输入框上沿
     *   思考云 ← 带内靠右，尾巴朝下
     *   台词框 ← 云左侧展开，向左生长
     *   呼噜泡 ← 睡觉时头顶右上
     */
    function LAY() {
      const form = currentForm();
      const g = G(form);
      const w = g.w;
      const h = g.h;
      const cloudSize = Math.round(w * RT.thinkSize);
      const cloudLeft = Math.round(w * RT.thinkX);
      const gapX = Math.round(w * RT.sayGapX);
      const band = Math.max(g.topPad, cloudSize + Math.round(h * 0.06));
      return {
        band,
        pet: { w, h },
        brick: { w: g.brickW, h: g.brickH, bottom: g.brickBottom },
        think: {
          left: cloudLeft,
          top: Math.round(h * RT.thinkY),
          size: cloudSize,
        },
        say: {
          // 右缘停在云的左侧（留 gap）——两者从构造上互不遮挡
          right: Math.round(w - cloudLeft + gapX),
          bottom: Math.round(h + h * RT.sayGapY),
          maxWidth: Math.round(w * RT.sayMaxW),
        },
        sleep: {
          right: Math.round(w * RT.sleepRight),
          top: Math.round(h * RT.sleepTop),
          size: Math.round(w * RT.sleepSize),
        },
      };
    }

    // ───────── 四个主要元素：位置全部来自 LAY()，自己不再持有几何 ─────────
    function SeatBrick({ lay }) {
      return h('div', {
        className: 'dsh-sitter-brick',
        style: {
          backgroundImage: 'url("' + SPRITES.brick + '")',
          width: lay.brick.w + 'px',
          height: lay.brick.h + 'px',
          bottom: lay.brick.bottom + 'px',
        },
      });
    }

    function SayBubble({ text, lay }) {
      if (!text) return null;
      return h('div', {
        className: 'dsh-sitter-say',
        style: {
          right: lay.say.right + 'px',
          bottom: lay.say.bottom + 'px',
          maxWidth: lay.say.maxWidth + 'px',
        },
      }, text);
    }

    function ThinkBubble({ lay }) {
      return h('div', {
        className: 'dsh-sitter-think',
        style: {
          left: lay.think.left + 'px',
          top: lay.think.top + 'px',
          width: lay.think.size + 'px',
          height: lay.think.size + 'px',
          backgroundImage: 'url("' + SPRITES.think + '")',
        },
      });
    }

    function SleepBubble({ lay }) {
      return h('div', {
        className: 'dsh-sitter-bubble',
        style: {
          right: lay.sleep.right + 'px',
          top: lay.sleep.top + 'px',
          width: lay.sleep.size + 'px',
          height: lay.sleep.size + 'px',
          backgroundImage: 'url("' + SPRITES.bubble + '")',
        },
      });
    }

    // 试衣间 8 格条带已废弃（换装改由左右双开门转场完成）
    const fmtTokens = (n) => {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(n);
    };
    const fmtMins = (m) => (m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm');
    
            // 闭眼持续
      // 停止输入多久算"打完字了"

    const CSS = `
@keyframes dshSitterBreath {
  0%, 100% { transform: translateY(0) scaleY(1); }
  50% { transform: translateY(-1.2px) scaleY(1.012); }
}
@keyframes dshSitterBreathSleep {
  0%   { transform: translateY(0) scale(1, 1); }
  45%  { transform: translateY(-2px) scale(1.008, 1.035); }
  55%  { transform: translateY(-1.8px) scale(1.008, 1.03); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes dshSitterSway {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  35% { transform: translateX(-1px) rotate(-0.6deg); }
  70% { transform: translateX(1px) rotate(0.5deg); }
}
@keyframes dshSitterBubble {
  0%, 62%   { opacity: 0; transform: translateY(3px) scale(0.6); }
  68%       { opacity: 0.95; transform: translateY(0) scale(0.9); }
  82%       { opacity: 0.9; transform: translateY(-9px) scale(1); }
  92%       { opacity: 0; transform: translateY(-15px) scale(1.05); }
  100%      { opacity: 0; transform: translateY(3px) scale(0.6); }
}
:root {
  --dsh-sitter-right: calc(max(var(--dsh-composer-side-clearance, 16px),
    (100% - var(--dsh-composer-card-max-width, 100%)) / 2) + 8px);
  --dsh-sitter-lift: ${INITIAL_LIFT}px;
}
.dsh-sitter-wrap {
  position: absolute;
  right: var(--dsh-sitter-right, 24px);
  bottom: var(--dsh-sitter-lift, 26px);
  height: calc(var(--pet-h) + var(--pet-toppad));
  width: var(--pet-w);
  pointer-events: none;
  z-index: 2;
  transform-origin: 50% 100%;
  animation: dshSitterSway 11s ease-in-out infinite;
  visibility: hidden;
}
.dsh-sitter-wrap[data-ready='1'] { visibility: visible; }
.dsh-sitter-wrap[data-fixed='1'] { animation: none !important; }
@keyframes dshTypeBob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-1px); }
}
.dsh-sitter-wrap[data-free='1'] { animation: none !important; z-index: 30; }
/* 换装：左右两扇小木门往中间关。门是 CSS 画的（木头纹 + 天蓝小窗 + 金色心形把手），
   比之前上下压的两块布更像"衣柜"，也更可爱。 */
/* 换装转场：礼物盒逐帧动画（打包 -> 换装 -> 拆封）。
   帧图是完整的一整张（不需要透明），直接当遮挡层铺满整个挂件区域。 */
.dsh-sitter-gift {
  /* 略微向外溢出：思考云/耳朵在挂件区边缘，遮不满会露头 */
  position: absolute; inset: -12px -8px -4px -8px;
  /* 帧图已裁到内容并抠掉背景：直接拉伸铺满，保证完全遮住宠物 */
  background-size: 100% 100%; background-position: center;
  background-repeat: no-repeat;
  z-index: 9;
  pointer-events: none;
}
.dsh-sitter-wrap[data-snapping='1'] { transition: left 180ms ease-out, top 180ms ease-out; }
.dsh-sitter-wrap[data-drag='1'] .dsh-sitter-brick { opacity: 0; }
.dsh-sitter-wrap[data-drag='1'] {
  animation: none !important;
  z-index: 40;
  filter: drop-shadow(0 3px 4px rgba(0,0,0,.18));
}
.dsh-sitter-wrap[data-drag='1'] .dsh-sitter-img {
  cursor: grabbing;
  animation: dshFly 380ms ease-in-out infinite;
}
@keyframes dshFly {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50%      { transform: translateY(-4px) rotate(1.5deg); }
}
.dsh-sitter-img {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: var(--pet-h);
  background-size: contain;
  background-position: center bottom;
  background-repeat: no-repeat;
  transform-origin: 50% 100%;
  animation: dshSitterBreath 3.8s ease-in-out infinite;
  image-rendering: auto;
}
.dsh-sitter-img[data-sleep='1'] {
  animation: dshSitterBreathSleep 5.2s ease-in-out infinite;
}
.dsh-sitter-img[data-working='1'] { animation: dshSitterSitDown 260ms ease-out; }
@keyframes dshSitterSitDown {
  0% { transform: translateY(-3px); }
  60% { transform: translateY(1px); }
  100% { transform: translateY(0); }
}
.dsh-sitter-wrap[data-attention='1'] .dsh-sitter-img { transform: translateY(-1px); }
.dsh-sitter-wrap[data-shake='1'] { animation: dshSitterShake 700ms ease-in-out; }
@keyframes dshSitterShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-2px); }
  40% { transform: translateX(2px); }
  60% { transform: translateX(-1px); }
  80% { transform: translateX(1px); }
}
.dsh-sitter-wrap[data-cheer='1'] .dsh-sitter-img { animation: dshSitterCheer 700ms ease-in-out 2; }
@keyframes dshSitterCheer {
  0%, 100% { transform: translateY(0); }
  35% { transform: translateY(-6px); }
  70% { transform: translateY(0); }
}
.dsh-sitter-img { pointer-events: auto; cursor: pointer; }
.dsh-sitter-img[data-poke='1'] { animation: dshPoke 600ms ease-out; }
@keyframes dshPoke {
  0%, 100% { transform: translateY(0) scale(1); }
  35% { transform: translateY(-4px) scale(1.03); }
  70% { transform: translateY(0) scale(0.99); }
}
.dsh-sitter-say {
  position: absolute;
  right: 44px;
  bottom: calc(var(--pet-h) + 6px);
  z-index: 5;
  max-width: 150px;
  padding: 5px 9px;
  background: #fdf7ea;
  border: 2px solid #2b2b36;
  border-radius: 10px;
  font: 700 11px/1.35 ui-monospace, Consolas, monospace;
  color: #2b2b36;
  white-space: nowrap;
  pointer-events: none;
  animation: dshRunBubble 1.6s ease-in-out infinite;
}
.dsh-sitter-runwrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}
.dsh-sitter-runner {
  position: absolute;
  bottom: calc(var(--pet-h) * 0.15);
  right: 0;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center bottom;
  image-rendering: auto;
  animation-name: dshRun;
  animation-timing-function: linear;
  animation-direction: alternate;
}
@keyframes dshRun {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-1 * var(--run-span, 46vw))); }
}
.dsh-sitter-runbulk {
  position: absolute;
  right: 6px;
  bottom: calc(var(--pet-h) + var(--pet-toppad) + 6px);
  padding: 6px 10px;
  background: #fdf7ea;
  border: 2px solid #2b2b36;
  border-radius: 10px;
  font: 700 12px/1.3 ui-monospace, Consolas, monospace;
  color: #2b2b36;
  white-space: nowrap;
  animation: dshRunBubble 1.2s ease-in-out infinite;
}
@keyframes dshRunBubble {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.dsh-sitter-veil {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 18, 26, 0.55);
  backdrop-filter: blur(1.5px);
  pointer-events: auto;
  z-index: 9999;
  animation: dshVeilIn 220ms ease-out;
}
@keyframes dshVeilIn { from { opacity: 0; } to { opacity: 1; } }
.dsh-sitter-grow {
  background-size: contain;
  background-position: center bottom;
  background-repeat: no-repeat;
  image-rendering: auto;
  transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: 50% 50%;
}
.dsh-sitter-veil[data-crack='1'] { animation: dshVeilIn 220ms ease-out, dshCrack 3.6s ease-in-out infinite; }
@keyframes dshCrack {
  0%, 8%, 100% { transform: translate(0, 0); }
  2% { transform: translate(-7px, 3px); }
  4% { transform: translate(6px, -3px); }
  6% { transform: translate(-3px, 2px); }
}
.dsh-sitter-veil-hint {
  position: absolute;
  bottom: 12vh;
  color: #fff;
  font: 14px/1.4 ui-monospace, Consolas, monospace;
  opacity: 0.75;
  animation: dshHintPulse 1.6s ease-in-out infinite;
}
@keyframes dshHintPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
.dsh-sitter-modal {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  min-width: 260px;
  padding: 20px 22px 18px;
  background: #fdf7ea;
  border: 3px solid #2b2b36;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  text-align: center;
  pointer-events: auto;
}
.dsh-sitter-modal-title { font: 700 17px/1.5 ui-monospace, Consolas, monospace; color: #2b2b36; }
.dsh-sitter-modal-sub { margin-top: 6px; font: 12px/1.5 ui-monospace, Consolas, monospace; color: #7a7a8c; }
.dsh-sitter-modal-btn {
  margin-top: 14px;
  width: 100%;
  padding: 8px 0;
  font: 700 14px/1 ui-monospace, Consolas, monospace;
  color: #101018;
  background: #ffd479;
  border: 2px solid #2b2b36;
  border-radius: 8px;
  cursor: pointer;
}
.dsh-sitter-modal-btn:active { transform: translateY(1px); }
.dsh-sitter-card {
  position: absolute;
  right: calc(100% + 10px);
  bottom: 12px;
  width: 132px;
  padding: 7px 9px 7px 8px;
  box-sizing: border-box;
  background: #fdf7ea;
  border: 2px solid #2b2b36;
  border-radius: 8px;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.12);
  font: 11px/1.5 ui-monospace, "Cascadia Mono", Consolas, monospace;
  color: #2b2b36;
  opacity: 0;
  transform: translateX(4px);
  transition: opacity 140ms ease-out, transform 140ms ease-out;
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
}
.dsh-sitter-card[data-on='1'] { opacity: 1; transform: translateX(0); }
.dsh-sitter-card::after {
  content: '';
  position: absolute;
  right: -7px;
  top: 50%;
  width: 10px;
  height: 10px;
  background: #fdf7ea;
  border-right: 2px solid #2b2b36;
  border-top: 2px solid #2b2b36;
  transform: translateY(-50%) rotate(45deg);
}
.dsh-sitter-row { display: flex; align-items: center; gap: 5px; }
.dsh-sitter-row + .dsh-sitter-row { margin-top: 2px; }
.dsh-sitter-icon {
  width: 14px; height: 14px;
  flex: none;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  image-rendering: auto;
}
.dsh-sitter-label { opacity: 0.72; }
.dsh-sitter-value { margin-left: auto; font-weight: 700; letter-spacing: 0.2px; }
.dsh-sitter-think {
  position: absolute;
  left: 56%;                 /* 挪到头顶偏右，不再贴右上角 */
  top: -2px;
  width: 30px;
  height: 30px;
  transform-origin: 20% 100%;  /* 尾巴朝向头顶 */
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  image-rendering: auto;
  opacity: 0;
  display: none;
  z-index: 4;
}
.dsh-sitter-wrap[data-think='1'][data-state='idle'][data-working='1'] .dsh-sitter-think {
  display: block;
  animation: dshSitterThink 2.4s ease-in-out infinite;
}
@keyframes dshSitterThink {
  0%, 100% { opacity: 0; transform: translateY(2px) scale(0.9); }
  15%, 75% { opacity: 1; transform: translateY(0) scale(1); }
  90% { opacity: 0; transform: translateY(-3px) scale(1); }
}
.dsh-sitter-bubble {
  position: absolute;
  right: -4px;
  top: 32px;
  width: 24px;
  height: 24px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  image-rendering: auto;
  opacity: 0;
  display: none;
}
.dsh-sitter-wrap[data-state='sleep'] .dsh-sitter-bubble {
  display: block;
  animation: dshSitterBubble 8.5s ease-in-out infinite;
}
.dsh-sitter-brick {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: var(--brick-bottom);
  width: var(--brick-w);
  height: var(--brick-h);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center bottom;
  image-rendering: auto;
  z-index: 0;
  display: none;
}
.dsh-sitter-wrap[data-state='idle'] .dsh-sitter-brick {
  display: block;
}
/* 打字时只让两帧图自己动：呼吸的 translateY 和两帧位移会互相抵消，看起来像没动 */
.dsh-sitter-img[data-working='1'] { animation: none; }
.dsh-sitter-dbg {
  position: absolute;
  right: 0;
  top: -18px;
  font: 11px/13px monospace;
  color: #c00;
  background: rgba(255,255,255,0.92);
  padding: 0 4px;
  border-radius: 3px;
  white-space: nowrap;
}
`;

    /** 横向贴输入框右缘、纵向坐输入框上沿，两个方向都实测。 */
    function calibrate(node, report, rise) {
      if (!node) return;
      // 自由摆放过就不要再贴回输入框：后面的 right / left='auto' 会覆盖 left/top
      if (node.getAttribute('data-free') === '1') return;
      const input = document.querySelector('textarea, [contenteditable="true"]');
      if (!input) return;
      const cb = node.offsetParent || node.parentElement;
      if (!cb) return;
      const cbr = cb.getBoundingClientRect();
      const ir = input.getBoundingClientRect();
      // 位置只由 seatInset 决定。dsh-pet 面板里的 corner / margin 属于桌面透明窗那套，
      // 不该影响页面内挂件的贴边 —— 之前它们串进来，导致"同样的 seatInset 位置却不一样"。
      const rightOffset = Math.round(cbr.right - ir.right) + RT.seatInset;
      node.style.right = rightOffset + 'px';
      node.style.left = 'auto';
      let lift = INITIAL_LIFT;
      node.style.setProperty('--dsh-sitter-lift', lift + 'px');
      let gap = node.getBoundingClientRect().bottom - ir.top;
      for (let i = 0; i < 3 && Math.abs(gap) > 1; i += 1) {
        lift = lift + gap;
        node.style.setProperty('--dsh-sitter-lift', lift + 'px');
        gap = node.getBoundingClientRect().bottom - ir.top;
      }
      // 让出金砖的高度：宠物要坐在砖上，而不是坐在输入框上
      lift = lift + (rise || 0);
      node.style.setProperty('--dsh-sitter-lift', lift + 'px');

      // 底部安全区：窗口延伸到任务栏后面时，整只往上抬，避免被切掉
      const SAFE_BOTTOM = 14;
      for (let s = 0; s < 3; s += 1) {
        const rr = node.getBoundingClientRect();
        const over = rr.bottom - (window.innerHeight - SAFE_BOTTOM);
        if (over <= 0) break;
        lift += over;
        node.style.setProperty('--dsh-sitter-lift', lift + 'px');
      }

      if (report) {
        const g2 = node.getBoundingClientRect().bottom - ir.top;
        report('dx:' + rightOffset + ' lift:' + Math.round(lift) + ' gap:' + g2.toFixed(1));
      }
    }

    // 模块级时间戳：槽位重挂载不会重置时间轴
    // 宿主端口可能在候选列表里漂移，先探测再固定下来
    const API_PORTS = [43717, 43718, 43719, 43720];
    let API_BASE = 'http://127.0.0.1:43717';
    let apiResolved = false;

    async function resolveApi() {
      if (apiResolved) return;
      apiResolved = true;
      for (const port of API_PORTS) {
        try {
          const r = await fetch('http://127.0.0.1:' + port + '/hello', { cache: 'no-store' });
          if (r.ok) {
            API_BASE = 'http://127.0.0.1:' + port;
            return;
          }
        } catch (e) { /* 试下一个 */ }
      }
    }

    const INSTANCE_ID = Math.random().toString(36).slice(2);
    let LOADED_AT = Date.now();
    let LAST_RESET = 0;

    function reportClientError(err) {
      try {
        fetch(API_BASE + '/client-error', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ msg: String(err && err.message || err), stack: String(err && err.stack || '') }),
        }).catch(() => {});
      } catch (e) { /* ignore */ }
    }

    /** 出错只让宠物消失，绝不拖垮整个页面 */
    class Boundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { failed: false };
      }
      static getDerivedStateFromError() {
        return { failed: true };
      }
      componentDidCatch(err) {
        reportClientError(err);
      }
      render() {
        return this.state.failed ? null : this.props.children;
      }
    }


    const PANEL_CSS = `
.dsh-sitter-panel { padding: 18px 20px 32px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #22222a; }
.dsh-sitter-panel-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
.dsh-sitter-panel-head h2 { margin: 0; font-size: 18px; font-weight: 700; }
.dsh-sitter-panel-coins { font-size: 13px; color: #6b6b7a; }
.dsh-sitter-panel-coins b { color: #d4921a; font-size: 15px; }
.dsh-sitter-panel-size { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 13px; color: #55555f; }
.dsh-sitter-panel-size input { flex: 1; max-width: 260px; accent-color: #b8862f; }
.dsh-sitter-toggle { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 13px; color: #55555f; cursor: pointer; }
.dsh-sitter-toggle input { width: 16px; height: 16px; accent-color: #b8862f; cursor: pointer; }
.dsh-sitter-rules { margin-top: 22px; padding-top: 14px; border-top: 1px dashed #e3e3ea; color: #55555f; }
.dsh-sitter-rules-title { font-size: 12px; font-weight: 700; color: #2b2b36; margin: 0 0 6px; }
.dsh-sitter-rules ul { margin: 0 0 14px; padding-left: 18px; }
.dsh-sitter-rules li { font-size: 12px; line-height: 1.7; color: #6b6b7a; }
.dsh-sitter-status { font-size: 11px; color: #8a8a96; margin: 0 0 8px; }
.dsh-sitter-err { font-size: 11px; color: #c0392b; margin-bottom: 8px; }
.dsh-sitter-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.dsh-sitter-tabs button { padding: 6px 16px; border-radius: 999px; border: 1px solid #dcdce4; background: #fff; font-size: 13px; cursor: pointer; color: #44444e; }
.dsh-sitter-tabs button.on { background: #2b2b36; color: #fff; border-color: #2b2b36; }
.dsh-sitter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(132px,100%), 1fr)); gap: 12px; align-items: start; max-height: 60vh; overflow-y: auto; padding: 2px; }
.dsh-sitter-pcard { box-sizing: border-box; min-height: 152px; border: 1px solid #e3e3ea; border-radius: 12px; padding: 10px; background: #fff; cursor: pointer; text-align: center; transition: box-shadow .15s, border-color .15s; }
.dsh-sitter-pcard:hover { border-color: #c9a227; box-shadow: 0 4px 14px rgba(0,0,0,.07); }
.dsh-sitter-pcard.on { border-color: #c9a227; box-shadow: 0 0 0 2px rgba(201,162,39,.25) inset; }
.dsh-sitter-pcard-art { height: 96px; background-repeat: no-repeat; background-position: center bottom; background-size: contain; image-rendering: auto; margin-bottom: 6px; }
.dsh-sitter-pcard-art.locked { filter: grayscale(1) brightness(.55) opacity(.5); }
.dsh-sitter-pcard-name { font-size: 13px; font-weight: 600; }
.dsh-sitter-pcard-hint { font-size: 11px; color: #8a8a96; margin-top: 2px; min-height: 14px; }
.dsh-sitter-buy { margin-top: 8px; width: 100%; padding: 6px 0; border-radius: 8px; border: 1px solid #2b2b36; background: #fffdf6; font-size: 12px; cursor: pointer; }
.dsh-sitter-buy.dim { opacity: .55; cursor: not-allowed; }
`;


    // ───────── 设置页面板：衣橱 + 商店 ─────────
    function WardrobePanel() {
      const [tab, setTab] = React.useState('wardrobe');
      const [skins, setSkins] = React.useState(null);
      const [coins, setCoins] = React.useState(null);
      const [size, setSize] = React.useState(83);
      const [pacifier, setPacifier] = React.useState(true);

      const patchCfg = (body) => {
        fetch(API_BASE + '/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
        // 同页面内广播：宠物立刻换，不用等下一次轮询
        try { window.dispatchEvent(new CustomEvent('dsh-sitter:cfg', { detail: body })); } catch { /* ignore */ }
      };

      const [err, setErr] = React.useState('');

      const load = () => {
        fetch(API_BASE + '/skins', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => { setSkins(d); setCoins(d.coins); setErr(''); })
          .catch((e) => setErr('接口失败: ' + String(e && e.message || e)));
        fetch(API_BASE + '/config', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => { setSize(d.displayHeight); setPacifier(d.features?.pacifier !== false); })
          .catch(() => {});
      };

      React.useEffect(() => { load(); }, []);

      const equip = (id) => {
        fetch(API_BASE + '/skins/equip', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        }).then(() => {
          try { window.dispatchEvent(new CustomEvent('dsh-sitter:cfg', { detail: { outfits: { force: id } } })); } catch { /* ignore */ }
          load();
        }).catch(() => {});
      };

      const buy = (id) => {
        fetch(API_BASE + '/skins/buy', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        }).then(() => load()).catch(() => {});
      };

      const setSizeTo = (v) => {
        setSize(v);
        fetch(API_BASE + '/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ displayHeight: v }),
        }).catch(() => {});
      };

      const catalog = skins?.items || [];
      // 缩略图跟随「戴奶嘴」开关：之前固定用 .pac，关掉奶嘴后面板还挂着奶嘴，看着像没更新
      const pacKey = pacifier ? '.pac' : '.nopac';
      const thumbOf = (id) => SPRITES[id + '.idle' + pacKey] || SPRITES[id + '.idle.pac'] || SPRITES['s0.idle.pac'];
      const balance = coins?.balance ?? 0;
      const equipped = skins?.equipped ?? null;

      // 衣橱上半区：季节 + 夜间，全部来自注册表（不再手写一张表）
      const seasonals = FORMS.filter((f) => f.kind !== 'skin').map((f) => ({
        id: f.id,
        name: f.label,
        hint: f.kind === 'night'
          ? '23:00–07:00 自动'
          : ((f.months || []).join(' / ') + ' 月自动'),
        art: SPRITES[f.id + '.idle.pac'] || SPRITES['s0.idle.pac'],
      }));

      return h('div', { className: 'dsh-sitter-panel' },
        h('style', null, PANEL_CSS),
        h('div', { className: 'dsh-sitter-panel-head' },
          h('h2', null, '贝草兰'),
          h('div', { className: 'dsh-sitter-panel-coins' }, '吉吉币 ', h('b', null, String(balance))),
        ),

        h('div', { className: 'dsh-sitter-panel-size' },
          h('span', null, '大小'),
          h('input', {
            type: 'range', min: 50, max: 140, step: 1, value: size,
            onChange: (e) => setSizeTo(Number(e.target.value)),
          }),
          h('b', null, size + ' px'),
        ),

        h('label', { className: 'dsh-sitter-toggle' },
          h('input', {
            type: 'checkbox',
            checked: pacifier,
            onChange: (e) => { setPacifier(e.target.checked); patchCfg({ features: { pacifier: e.target.checked } }); },
          }),
          h('span', null, '戴奶嘴'),
        ),
        err ? h('div', { className: 'dsh-sitter-err' }, err) : null,
        h('div', { className: 'dsh-sitter-status' },
          '数据：' + (skins ? ((skins.items || []).length + ' 件商品') : '加载中…') +
          (coins ? '，余额 ' + coins.balance : '')),
        h('div', { className: 'dsh-sitter-tabs' },
          h('button', { className: tab === 'wardrobe' ? 'on' : '', onClick: () => setTab('wardrobe') }, '衣橱'),
          h('button', { className: tab === 'shop' ? 'on' : '', onClick: () => setTab('shop') }, '商店'),
        ),

        h('div', { className: 'dsh-sitter-rules' },
          h('div', { className: 'dsh-sitter-rules-title' }, '吉吉币怎么赚'),
          h('ul', null,
            h('li', null, '每学习 10 分钟 = 1 枚吉吉币（看书、写代码、查资料都算）'),
            h('li', null, '只有你在干活时才计时，摸鱼不算'),
            h('li', null, '每天 0 点重置当日时长，币不会清零'),
            h('li', null, '皮肤买到就永久解锁，换着穿不额外扣币'),
          ),
          h('div', { className: 'dsh-sitter-rules-title' }, '商店说明'),
          h('ul', null,
            h('li', null, '价格 20–200 币，越贵越稀有'),
            h('li', null, '买完自动换上；以后在「衣橱」里随时切'),
            h('li', null, '12 套皮肤，每套都有戴/不戴奶嘴两版'),
            h('li', null, '吉吉币只在本地保存，不上传任何服务器'),
          ),
        ),
        tab === 'wardrobe'
          ? h('div', { className: 'dsh-sitter-grid' },
            seasonals.map((s) => h('div', {
              key: s.id,
              className: 'dsh-sitter-pcard' + (String(equipped) === s.id ? ' on' : ''),
              onClick: () => equip(s.id),
            },
              h('div', { className: 'dsh-sitter-pcard-art', style: {
                backgroundImage: 'url("' + s.art + '")',
              } }),
              h('div', { className: 'dsh-sitter-pcard-name' }, s.name),
              h('div', { className: 'dsh-sitter-pcard-hint' }, s.hint),
            )),
            catalog.filter((s) => s.owned).map((s) => h('div', {
              key: s.id,
              className: 'dsh-sitter-pcard' + (equipped === s.id ? ' on' : ''),
              onClick: () => equip(s.id),
            },
              h('div', { className: 'dsh-sitter-pcard-art', style: { backgroundImage: 'url("' + thumbOf(s.id) + '")' } }),
              h('div', { className: 'dsh-sitter-pcard-name' }, s.name),
              h('div', { className: 'dsh-sitter-pcard-hint' }, '已解锁'),
            )),
          )
          : h('div', { className: 'dsh-sitter-grid' },
            catalog.map((s) => h('div', { key: s.id, className: 'dsh-sitter-pcard' + (s.owned ? ' owned' : '') },
              h('div', { className: 'dsh-sitter-pcard-art' + (s.owned ? '' : ' locked'), style: {
                backgroundImage: 'url("' + (SPRITES[s.id + '.idle.pac'] || SPRITES['s0.idle.pac']) + '")',
              } }),
              h('div', { className: 'dsh-sitter-pcard-name' }, s.name),
              h('div', { className: 'dsh-sitter-pcard-hint' }, s.desc || ''),
              s.owned
                ? h('button', { className: 'dsh-sitter-buy', onClick: () => equip(s.id) }, '穿上')
                : h('button', {
                    className: 'dsh-sitter-buy' + (s.affordable ? '' : ' dim'),
                    disabled: !s.affordable,
                    onClick: () => buy(s.id),
                  }, s.affordable ? (s.price + ' 币解锁') : ('还差 ' + (s.price - balance) + ' 币')),
            )),
          ),
      );
    }

    function Sitter() {
      const owned = () => (typeof window === 'undefined' ? true : window.__dshSitterOwner === INSTANCE_ID);
      const wrapRef = React.useRef(null);
      const stateRef = React.useRef('sleep');
      const forceAt = React.useRef(0);
      const hoverRef = React.useRef(false);
      const lastCmdAt = React.useRef(0);
      const triggerRef = React.useRef(null);
      const stageRef = React.useRef(0);
      const runningRef = React.useRef(false);
      const lastUserRef = React.useRef('');
      const prevErr = React.useRef(0);
      const prevEnd = React.useRef(0);

      const [ready, setReady] = React.useState(false);
      const [now, setNow] = React.useState(() => Date.now());
      const [dbg, setDbg] = React.useState('');
      const [typing, setTyping] = React.useState(false);
      const [blink, setBlink] = React.useState(false);
      const [hover, setHover] = React.useState(false);
      const [stats, setStats] = React.useState(null);
      const [agent, setAgent] = React.useState(null);
      const [working, setWorking] = React.useState(false);
      const [shake, setShake] = React.useState(false);
      const [cheer, setCheer] = React.useState(false);
      const [attention, setAttention] = React.useState(false);
      const [force, setForce] = React.useState(null);
      const [cfg, setCfg] = React.useState(null);
      const [stage, setStage] = React.useState(0);
      const [prompt, setPrompt] = React.useState(false);
      const [angryFrame, setAngryFrame] = React.useState(0);
      const [running, setRunning] = React.useState(false);
      const [say, setSay] = React.useState('');
      const [poke, setPoke] = React.useState(false);
      const [dragging, setDragging] = React.useState(false);
      const [ultra, setUltra] = React.useState(false);
      const [menu, setMenu] = React.useState(false);
      // 已经有别的活实例在位 → 从第一帧起就不画（否则先闪一只再退场 = 重影）
      const [dead, setDead] = React.useState(() => {
        if (typeof window === 'undefined') return false;
        const cur = window.__dshSitterOwner;
        return !!cur && cur !== INSTANCE_ID;
      });
      const ultraFrameRef = React.useRef(0);
      const [freePos, setFreePos] = React.useState(null);
      const [snapping, setSnapping] = React.useState(false);
      const [giftFrame, setGiftFrame] = React.useState(-1);   // -1 = 不显示
      const giftRef = React.useRef({ form: null, timer: 0 });
      // 屏幕上实际显示的形态：只有"门关上"时才更新，避免看到换装瞬间
      const [displayForm, setDisplayForm] = React.useState(() => currentForm());
      // 上一帧的状态：用来判断"是不是刚从睡觉醒过来"
      const priorStateRef = React.useRef('sleep');
      const [shift, setShift] = React.useState({ x: 0, y: 0 });
      const shiftRef = React.useRef({ x: 0, y: 0 });
      const dragRef = React.useRef(null);
      const lastSayRef = React.useRef('');
      const [runFrame, setRunFrame] = React.useState(0);
      const workMsRef = React.useRef(0);
      const lastTickRef = React.useRef(Date.now());
      const lastInput = React.useRef(Date.now());
      const busyRef = React.useRef(false);

      /** 说一句（统一入口：去重 + 自动收起） */
      const sayOnce = (poolName, holdMs) => {
        const line = pickFrom(poolName);
        if (!line) return;
        lastSayRef.current = line;
        setSay(line);
        window.setTimeout(() => setSay(''), holdMs || RT.chatDurationMs);
      };
      /** 事件型台词：同类事件 45 秒内只播一次，避免刷屏 */
      const evtAtRef = React.useRef({});
      const sayEvent = (key, poolName, holdMs) => {
        const nowTs = Date.now();
        if (nowTs - (evtAtRef.current[key] || 0) < 45000) return;
        evtAtRef.current[key] = nowTs;
        sayOnce(poolName, holdMs);
      };

      hoverRef.current = hover;
      stageRef.current = stage;
      runningRef.current = running;
      if (agent && typeof agent.lastUser === 'string') lastUserRef.current = agent.lastUser;

      // 配置里位置被清空 → 回到吸附位（否则拖出屏幕后再也回不来）
      const cfgPosRef = React.useRef(null);
      React.useEffect(() => {
        const has = RT.freeLeft !== null || RT.freeTop !== null;
        const prev = cfgPosRef.current;
        cfgPosRef.current = has;
        if (prev === true && has === false) setFreePos(null);
      }, [RT.freeLeft, RT.freeTop]);
      const agentBusy = RT.workLink && !!(agent && agent.phase === 'busy');

      // ---- 资源预载 + 心跳 ----
      React.useEffect(() => {
        let alive = true;
        let pending = Object.keys(SPRITES).length;
        for (const key of Object.keys(SPRITES)) {
          const img = new Image();
          const done = () => { pending -= 1; if (alive && pending === 0) setReady(true); };
          img.onload = done;
          img.onerror = done;
          img.src = SPRITES[key];
        }
        let lastState = 'sleep';
        const tick = setInterval(() => {
          if (!alive) return;
          setNow(Date.now());
          const s = stateRef.current;
          if (s !== lastState) {
            lastState = s;
            requestAnimationFrame(() => {
              calibrate(wrapRef.current, DEBUG ? setDbg : null, s === 'idle' ? G().seatRise : 0);
            });
          }
        }, 120);
        return () => { alive = false; clearInterval(tick); };
      }, []);

      // ---- 位置校准 ----
      React.useLayoutEffect(() => {
        const run = () => requestAnimationFrame(() => {
          calibrate(wrapRef.current, DEBUG ? setDbg : null, stateRef.current === 'idle' ? G().seatRise : 0);
        });
        run();
        window.addEventListener('resize', run);
        let ro;
        let retry = null;
        let tries = 0;
        const attach = () => {
          try {
            const input = document.querySelector('textarea, [contenteditable="true"]');
            if (!input) {
              tries += 1;
              if (tries < 60) retry = setTimeout(attach, 500);
              return;
            }
            run();
            if (typeof ResizeObserver !== 'undefined') {
              ro = new ResizeObserver(run);
              ro.observe(input);
              if (input.parentElement) ro.observe(input.parentElement);
            }
          } catch (e) { /* ignore */ }
        };
        attach();
        return () => {
          window.removeEventListener('resize', run);
          if (ro) ro.disconnect();
          if (retry) clearTimeout(retry);
        };
      }, []);

      // ---- 打字监听 ----
      React.useEffect(() => {
        const input = document.querySelector('textarea, [contenteditable="true"]');
        if (!input) return undefined;
        let hold = null;
        const bump = () => {
          setTyping(true);
          if (hold) clearTimeout(hold);
          hold = setTimeout(() => setTyping(false), RT.typingHoldMs);
        };
        input.addEventListener('input', bump);
        input.addEventListener('keydown', bump);
        return () => {
          input.removeEventListener('input', bump);
          input.removeEventListener('keydown', bump);
          if (hold) clearTimeout(hold);
        };
      }, []);

      // ---- 眨眼 ----
      React.useEffect(() => {
        let alive = true;
        let a = null;
        let b = null;
        const schedule = () => {
          a = setTimeout(() => {
            if (!alive) return;
            setBlink(true);
            b = setTimeout(() => {
              if (!alive) return;
              setBlink(false);
              schedule();
            }, RT.blinkMs);
          }, 3500 + Math.random() * 3000);
        };
        schedule();
        return () => {
          alive = false;
          if (a) clearTimeout(a);
          if (b) clearTimeout(b);
        };
      }, []);

      // ---- 学习监督：长时间没操作就逐步放大 ----
      React.useEffect(() => {
        const touch = () => { lastInput.current = Date.now(); };
        window.addEventListener('mousemove', touch, { passive: true });
        window.addEventListener('keydown', touch);
        window.addEventListener('pointerdown', touch);
        window.addEventListener('wheel', touch, { passive: true });
        return () => {
          window.removeEventListener('mousemove', touch);
          window.removeEventListener('keydown', touch);
          window.removeEventListener('pointerdown', touch);
          window.removeEventListener('wheel', touch);
        };
      }, []);

      // 空闲到阈值 → 进入第 1 级
      React.useEffect(() => {
        const timer = setInterval(() => {
          if (!RT.escalateEnabled || prompt) return;
          const idle = Date.now() - lastInput.current;
          if (idle >= RT.escalateIdleMs) {
            setStage((s) => (s === 0 ? 1 : s));
          }
        }, 1000);
        return () => clearInterval(timer);
      }, [prompt]);

      // 升级后每 stepMs 翻倍，直到占满屏幕
      React.useEffect(() => {
        if (stage === 0 || prompt) return undefined;
        const timer = setInterval(() => {
          setStage((s) => (s >= fullStageOf() ? s : s + 1));
        }, RT.escalateStepMs);
        return () => clearInterval(timer);
      }, [stage, prompt]);

      // 鼠标一动就取消升级（人回来了）
      React.useEffect(() => {
        if (stage === 0 || prompt) return undefined;
        if (stage >= fullStageOf()) return undefined; // 已占满：锁定，等人点
        const reset = () => setStage(0);
        window.addEventListener('mousemove', reset, { passive: true });
        window.addEventListener('pointerdown', reset);
        window.addEventListener('keydown', reset);
        return () => {
          window.removeEventListener('mousemove', reset);
          window.removeEventListener('pointerdown', reset);
          window.removeEventListener('keydown', reset);
        };
      }, [stage, prompt]);

      // 锁定后空挥鞭：两帧循环
      React.useEffect(() => {
        if (stage === 0 || prompt) return undefined;
        if (stage < fullStageOf()) return undefined;
        const timer = setInterval(() => setAngryFrame((f) => (f + 1) % 4), 180);
        return () => clearInterval(timer);
      }, [stage, prompt]);

      // 单实例仲裁：最后一个挂载的实例持有 owner，其余自行退场（绝不互删 DOM）
      // 用 useLayoutEffect：在 paint 之前就决定画不画，否则后挂载的会先画一帧叠成两只
      React.useLayoutEffect(() => {
        const now = Date.now();
        const cur = window.__dshSitterOwner;
        const at = window.__dshSitterOwnerAt || 0;
        if (!cur || cur === INSTANCE_ID || now - at > 2500) {
          window.__dshSitterOwner = INSTANCE_ID;
          window.__dshSitterOwnerAt = now;
          if (dead) setDead(false);
        } else if (!dead) {
          setDead(true);
        }
        return () => {
          if (window.__dshSitterOwner === INSTANCE_ID) {
            window.__dshSitterOwner = null;
            window.__dshSitterOwnerAt = 0;
          }
        };
      }, []);

      // 面板里改了设置 → 立刻生效，不用等轮询
      React.useEffect(() => {
        const onCfg = (e) => {
          const patch = e && e.detail;
          if (!patch) return;
          applyConfig(patch);
          setCfg((old) => {
            const next = { ...(old || {}) };
            for (const k of Object.keys(patch || {})) {
              const v = patch[k];
              next[k] = (v && typeof v === 'object' && !Array.isArray(v))
                ? { ...(next[k] || {}), ...v }
                : v;
            }
            return next;
          });
        };
        window.addEventListener('dsh-sitter:cfg', onCfg);
        return () => window.removeEventListener('dsh-sitter:cfg', onCfg);
      }, []);

      // owner 心跳：每 1.2s 检查一次，只在 effect 里改 state
      React.useEffect(() => {
        const tick = window.setInterval(() => {
          const t = Date.now();
          if (window.__dshSitterOwner === INSTANCE_ID) {
            window.__dshSitterOwnerAt = t;
            setDead(false);
          } else if (!window.__dshSitterOwner || t - (window.__dshSitterOwnerAt || 0) > 2500) {
            window.__dshSitterOwner = INSTANCE_ID;
            window.__dshSitterOwnerAt = t;
            setDead(false);
          } else {
            setDead(true);
          }
        }, 1200);
        return () => window.clearInterval(tick);
      }, []);

      // 换装转场：礼物盒打包 -> 完全遮住的那一帧换装 -> 拆封
      // 从睡觉醒过来时不播（那是起床，不是换衣服）；首次加载也不播。
      React.useEffect(() => {
        const target = currentForm();
        if (target === giftRef.current.form) return;
        const firstTime = giftRef.current.form === null;
        const wokeUp = priorStateRef.current === 'sleep';
        clearTimeout(giftRef.current.timer);
        giftRef.current.form = target;
        if (firstTime || wokeUp) {
          setDisplayForm(target);
          setGiftFrame(-1);
          return;
        }
        const frames = GIFT_FRAMES;
        const ms = Math.max(40, Math.min(2000, RT.giftFrameMs || 90));
        let f = 0;
        const wrapUp = () => {
          if (f < frames) { setGiftFrame(f); f += 1; giftRef.current.timer = window.setTimeout(wrapUp, ms); return; }
          setDisplayForm(target);                       // 最后一帧完全遮住时换装
          setGiftFrame(frames - 1);
          giftRef.current.timer = window.setTimeout(unwrap, ms * 3);
        };
        const unwrap = () => {
          f -= 1;
          if (f >= 0) { setGiftFrame(f); giftRef.current.timer = window.setTimeout(unwrap, ms); return; }
          setGiftFrame(-1);
        };
        giftRef.current.timer = window.setTimeout(wrapUp, ms);
      }, [cfg, force, working]);

      // 上报客户端版本：定期上报，便于确认线上跑的是哪一版
      React.useEffect(() => {
        resolveApi();
        const beacon = () => {
          fetch(API_BASE + '/hello', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ v: '__BUILD_VERSION__' }),
          }).catch(() => {});
        };
        beacon();
        const timer = setInterval(beacon, 20000);
        return () => clearInterval(timer);
      }, []);

      // 累计连续工作时长，到点就跑一圈提醒休息
      React.useEffect(() => {
        const timer = setInterval(() => {
          const nowTs = Date.now();
          const dt = nowTs - lastTickRef.current;
          lastTickRef.current = nowTs;
          if (running) return;
          const busy = typing || (RT.workLink && agent && agent.phase === 'busy');
          if (busy) workMsRef.current += dt;
          else workMsRef.current = Math.max(0, workMsRef.current - dt * 0.5);
          if (RT.breakWorkMs > 0 && workMsRef.current >= RT.breakWorkMs) {
            workMsRef.current = 0;
            setRunning(true);
            setRunFrame(0);
            setTimeout(() => setRunning(false), RT.breakRunMs);
          }
        }, 1000);
        return () => clearInterval(timer);
      }, [running, typing, agent]);

      // 跑步动画帧
      React.useEffect(() => {
        if (!running) return undefined;
        const timer = setInterval(() => setRunFrame((f) => (f + 1) % 4), 140);
        return () => clearInterval(timer);
      }, [running]);

      // 主动碎碎念：间隔带随机；你在忙就更安静，很久没人理就更黏
      React.useEffect(() => {
        let last = Date.now();
        let need = RT.chatIntervalMs;
        const timer = setInterval(() => {
          if (!RT.chatEnabled) return;
          if (stageRef.current > 0 || runningRef.current) return;
          const nowTs = Date.now();
          if (nowTs - last < need) return;
          const alone = nowTs - lastInput.current > 120000;
          need = Math.round(RT.chatIntervalMs * (0.75 + Math.random() * 0.6) * (busyRef.current ? 1.7 : 1) * (alone ? 0.7 : 1));
          // 60% 优先看你最后一条消息，其余走时段池
          const ctxLine = Math.random() < 0.6 ? pickContextLine(lastUserRef.current) : null;
          const line = ctxLine || pickLine();
          if (!line) { last = nowTs; return; }
          last = nowTs;
          lastSayRef.current = line;
          setSay(line);
          setTimeout(() => setSay(''), RT.chatDurationMs);
        }, 1500);
        return () => clearInterval(timer);
      }, []);

      // 刚睡醒：说一句
      React.useEffect(() => {
        if (priorStateRef.current === 'sleep' && state === 'idle') sayEvent('wake', 'wake', 3000);
      }, [now]);

      // ---- 运行时配置 ----
      const loadConfig = () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetch(API_BASE + '/config', { cache: 'no-store' })
          .then((r) => r.json())
          .then((c) => {
            applyConfig(c);
            if (typeof c.resetAt === 'number' && c.resetAt !== LAST_RESET) {
              LAST_RESET = c.resetAt;
              if (c.resetAt > LOADED_AT) {
                LOADED_AT = Date.now();
                setNow(Date.now());
              }
            }
            setCfg(c);
          })
          .catch(() => {});
      };
      React.useEffect(() => {
        loadConfig();
        const timer = setInterval(loadConfig, 5000);
        return () => clearInterval(timer);
      }, []);

      const patchConfig = (body) => {
        fetch(API_BASE + '/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
      };

      const setSizeBy = (delta) => {
        const next = Math.max(50, Math.min(140, Math.round((RT.displayHeight || 83) + delta)));
        patchConfig({ displayHeight: next });
        setSay('这样大小合适吗');
        setTimeout(() => setSay(''), 1800);
      };


      /** 唯一的贴图决策：先看是否变身/拖动，再按状态取图 */
      const spriteFor = (draggingNow, form, pose) => {
        if (draggingNow) {
          return SPRITES.ultra0;
        }
        return formSprite(form, pose);
      };

      const spriteSleep = (ultraNow) => {
        if (ultraNow) return SPRITES.ultra0;
        return SPRITES.sleep;
      };

      const VIEW_PAD = 8;
      const EDGE_MAGNET = 40;
      const ANCHOR_MAGNET = 80;
      const BOTTOM_SAFE = 14;
      const SEAT_OVERLAP = 10;
      const SEAT_SIDE = 6;

      const parentBox = () => {
        const node = wrapRef.current;
        const parent = node && (node.offsetParent || node.parentElement);
        if (!node || !parent) return null;
        return { node, pr: parent.getBoundingClientRect() };
      };

      /** 视口坐标 → 夹进屏幕 → 换回父元素坐标 */
      const clampViewport = (vx, vy) => {
        const b = parentBox();
        if (!b) return { x: Math.round(vx), y: Math.round(vy) };
        const { node, pr } = b;
        const maxVX = Math.max(VIEW_PAD, window.innerWidth - node.offsetWidth - VIEW_PAD);
        const maxVY = Math.max(VIEW_PAD, window.innerHeight - node.offsetHeight - VIEW_PAD);
        const cx = Math.round(Math.min(maxVX, Math.max(VIEW_PAD, vx)));
        const cy = Math.round(Math.min(maxVY, Math.max(VIEW_PAD, vy)));
        return { x: cx - Math.round(pr.left), y: cy - Math.round(pr.top) };
      };

      const composerBox = () => {
        const el = document.querySelector('textarea, [contenteditable="true"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { left: r.left, right: r.right, top: r.top };
      };

      /** 视口内的合法范围 */
      const viewportBox = () => {
        const b = parentBox();
        if (!b) return null;
        const { node, pr } = b;
        return {
          node, pr,
          minX: VIEW_PAD,
          maxX: Math.max(VIEW_PAD, window.innerWidth - node.offsetWidth - VIEW_PAD),
          minY: VIEW_PAD,
          maxY: Math.max(VIEW_PAD, window.innerHeight - node.offsetHeight - BOTTOM_SAFE),
        };
      };

      /** 6 个吸附点：四角 + 输入框左右两端 */
      const snapAnchors = () => {
        const box = viewportBox();
        if (!box) return [];
        const w = box.node.offsetWidth;
        const h = box.node.offsetHeight;
        const list = [
          { id: 'tl', x: box.minX, y: box.minY },
          { id: 'tr', x: box.maxX, y: box.minY },
          { id: 'bl', x: box.minX, y: box.maxY },
          { id: 'br', x: box.maxX, y: box.maxY },
        ];
        const cb = composerBox();
        if (cb) {
          const y = cb.top - h + SEAT_OVERLAP;
          list.push({ id: 'seat-left', x: cb.left - w + SEAT_SIDE, y });
          list.push({ id: 'seat-right', x: cb.right - SEAT_SIDE, y });
        }
        return list.map((a) => ({
          id: a.id,
          x: Math.min(box.maxX, Math.max(box.minX, a.x)),
          y: Math.min(box.maxY, Math.max(box.minY, a.y)),
        }));
      };

      /** 拖动中：离屏幕三边 ≤40px 就贴上去（下边已含安全区） */
      const magnetEdges = (vx, vy) => {
        const box = viewportBox();
        if (!box) return { x: vx, y: vy };
        const cx = vx <= box.minX + EDGE_MAGNET ? box.minX
          : box.maxX - vx <= EDGE_MAGNET ? box.maxX : vx;
        const cy = vy <= box.minY + EDGE_MAGNET ? box.minY
          : box.maxY - vy <= EDGE_MAGNET ? box.maxY : vy;
        return { x: cx, y: cy };
      };

      /** 松手：先吸 6 个点（80px），再退化贴边，都不满足原地停 */
      const snapOnRelease = (pos) => {
        const box = viewportBox();
        if (!box) return pos;
        const vx = pos.x + box.pr.left;
        const vy = pos.y + box.pr.top;
        let best = null;
        for (const a of snapAnchors()) {
          const d = Math.hypot(a.x - vx, a.y - vy);
          if (d <= ANCHOR_MAGNET && (!best || d < best.d)) best = { d, a };
        }
        if (best) {
          return { x: Math.round(best.a.x - box.pr.left), y: Math.round(best.a.y - box.pr.top) };
        }
        const m = magnetEdges(vx, vy);
        return { x: Math.round(m.x - box.pr.left), y: Math.round(m.y - box.pr.top) };
      };

      const onDragStart = (e) => {
        if (typeof e.button === 'number' && e.button !== 0) return;
        const b = parentBox();
        if (!b) return;
        const { node, pr } = b;
        const nr = node.getBoundingClientRect();
        dragRef.current = { dx: e.clientX - nr.left, dy: e.clientY - nr.top, startX: e.clientX, startY: e.clientY, moved: false };
        setFreePos({ x: Math.round(nr.left - pr.left), y: Math.round(nr.top - pr.top) });
        setDragging(true);
        try { node.setPointerCapture && node.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      };

      React.useEffect(() => {
        if (!dragging) return undefined;
        const tick = setInterval(() => { ultraFrameRef.current += 1; }, 220);

        const move = (e) => {
          if (e.buttons !== undefined && (e.buttons & 1) === 0) return;
          const d = dragRef.current;
          if (!d) return;
          if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 6) d.moved = true;
          const m = magnetEdges(e.clientX - d.dx, e.clientY - d.dy);
          setFreePos(clampViewport(m.x, m.y));
        };

        const up = () => {
          const d = dragRef.current;
          if (d && d.moved) d.endedAt = Date.now();
          setDragging(false);
          setFreePos((pos) => {
            if (!pos) return pos;
            const next = snapOnRelease(pos);
            if (next.x !== pos.x || next.y !== pos.y) {
              setSnapping(true);
              window.setTimeout(() => setSnapping(false), 260);
            }
            fetch(API_BASE + '/config', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ layout: { freeLeft: next.x, freeTop: next.y } }),
            }).catch(() => {});
            return next;
          });
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => {
          clearInterval(tick);
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
      }, [dragging]);

      React.useEffect(() => {
        if (!menu) return undefined;
        const close = () => setMenu(false);
        const t = setTimeout(() => {
          document.addEventListener('pointerdown', close, { once: true });
        }, 50);
        return () => {
          clearTimeout(t);
          document.removeEventListener('pointerdown', close);
        };
      }, [menu]);

      const onPoke = (e) => {
        const dg = dragRef.current;
        if (dg && dg.moved && Date.now() - (dg.endedAt || 0) < 400) {
          e.stopPropagation();
          return;
        }
        if (dragging) { e.stopPropagation(); return; }
        e.stopPropagation();
        sayOnce('poke', 2200);
        setPoke(true);
        setTimeout(() => setPoke(false), 600);
        setTimeout(() => setSay(''), 2200);
      };

      const reportReminder = () => {
        fetch(API_BASE + '/reminder', { method: 'POST' })
          .then((r) => r.json())
          .then((d) => setStats((s) => ({ ...(s || {}), reminders: d.reminders })))
          .catch(() => {});
      };

      // 尺寸类参数写进 CSS 变量
      React.useEffect(() => {
        const node = wrapRef.current;
        if (!node) return;
        const g = G();
        node.style.setProperty('--pet-h', g.h + 'px');
        node.style.setProperty('--pet-w', g.w + 'px');
        node.style.setProperty('--pet-toppad', LAY().band + 'px');
        node.style.setProperty('--brick-w', g.brickW + 'px');
        node.style.setProperty('--brick-h', g.brickH + 'px');
        node.style.setProperty('--brick-bottom', g.brickBottom + 'px');
        calibrate(node, DEBUG ? setDbg : null, stateRef.current === 'idle' ? G().seatRise : 0);
      }, [cfg, ready]);

      // ---- 宿主状态轮询 ----
      React.useEffect(() => {
        let alive = true;
        const poll = () => {
          fetch(API_BASE + '/state', { cache: 'no-store' })
            .then((r) => r.json())
            .then((d) => {
              if (!alive) return;
              setAgent(d);
              if (d.cmd && d.cmd.at && d.cmd.at !== lastCmdAt.current) {
                lastCmdAt.current = d.cmd.at;
                if (triggerRef.current) triggerRef.current(d.cmd.name);
              }
            })
            .catch(() => {});
        };
        poll();
        const timer = setInterval(poll, 2000);
        return () => { alive = false; clearInterval(timer); };
      }, []);

      // ---- 出错抖动 / 完成庆祝 ----
      React.useEffect(() => {
        if (!agent) return;
        if (agent.lastErrorAt && agent.lastErrorAt !== prevErr.current) {
          prevErr.current = agent.lastErrorAt;
          setShake(true);
          sayEvent('error', 'error', 3200);
          setTimeout(() => setShake(false), 700);
        }
        if (agent.turnEndAt && agent.turnEndAt !== prevEnd.current) {
          prevEnd.current = agent.turnEndAt;
          const dur = agent.turnEndAt - (agent.turnStartAt || agent.turnEndAt);
          setCheer(true);
          setTimeout(() => setCheer(false), dur > 90_000 ? 1400 : 600);
          sayEvent('done', 'done', 3200);
        }
      }, [agent]);

      // ---- 干活态：真干活或你打字，收工时保持 800ms ----
      const wantWork = (RT.typing && typing) || agentBusy;
      React.useEffect(() => {
        if (wantWork) { setWorking(true); return undefined; }
        const timer = setTimeout(() => setWorking(false), 800);
        return () => clearTimeout(timer);
      }, [wantWork]);

      // ---- 空输入框且有焦点 ----
      React.useEffect(() => {
        const check = () => {
          const el = document.querySelector('textarea, [contenteditable="true"]');
          if (!el) { setAttention(false); return; }
          const focused = document.activeElement === el;
          const empty = 'value' in el ? !el.value : !el.textContent;
          setAttention(!!focused && !!empty);
        };
        check();
        const timer = setInterval(check, 600);
        return () => clearInterval(timer);
      }, []);

      // ---- 悬停（不占用 pointer-events） ----
      React.useEffect(() => {
        let raf = 0;
        const onMove = (e) => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            const node = wrapRef.current;
            if (!node) return;
            const r = node.getBoundingClientRect();
            const inside = e.clientX >= r.left && e.clientX <= r.right
              && e.clientY >= r.top && e.clientY <= r.bottom;
            setHover((prev) => (prev === inside ? prev : inside));
          });
        };
        window.addEventListener('mousemove', onMove, { passive: true });
        return () => {
          window.removeEventListener('mousemove', onMove);
          if (raf) cancelAnimationFrame(raf);
        };
      }, []);

      // ---- 悬停取统计 ----
      React.useEffect(() => {
        if (!hover) return undefined;
        let alive = true;
        const load = () => {
          fetch(API_BASE + '/stats', { cache: 'no-store' })
            .then((r) => r.json())
            .then((d) => { if (alive) setStats(d); })
            .catch(() => { if (alive) setStats(null); });
        };
        load();
        const timer = setInterval(load, 15000);
        return () => { alive = false; clearInterval(timer); };
      }, [hover]);

      const runSelfTest = () => {
        const results = [];
        const check = (name, fn) => {
          try {
            const r = fn();
            results.push({ name, pass: r === true, detail: r === true ? '' : String(r) });
          } catch (e) {
            results.push({ name, pass: false, detail: String((e && e.message) || e) });
          }
        };

        check('换装判定可用', () => {
          const f = currentForm();
          return /^(pajama|s[0-3])$/.test(f) ? true : 'unexpected form: ' + f;
        });
        check('四种姿态都有图', () => {
          const f = currentForm();
          const keys = ['idle', 'blink', 'typing'].map((p) => formSprite(f, p));
          return keys.every((u) => typeof u === 'string' && u.indexOf('data:image') === 0) ? true : 'missing sprite';
        });
        check('几何量正常', () => {
          const g = G();
          return g.h > 20 && g.w > 10 && g.brickBottom !== undefined ? true : JSON.stringify(g);
        });
        check('锚点找到输入框', () => {
          const el = document.querySelector('textarea, [contenteditable="true"]');
          return el ? true : 'no composer';
        });
        check('悬停卡数据可用', () => {
          const el = document.querySelector('.dsh-sitter-wrap');
          return el ? true : 'wrap not in dom';
        });
        check('句子池非空', () => {
          const pools = ['work', 'idle', 'night', 'morning', 'noon'].map((k) => (LINES[k] || []).length);
          return pools.every((n) => n > 0) ? true : 'empty pool: ' + pools.join(',');
        });
        check('监督帧齐备', () => {
          for (let i = 0; i < 4; i += 1) {
            if (!SPRITES['angry' + i]) return 'angry' + i + ' missing';
          }
          return true;
        });
        check('内容感知台词可用', () => {
          const line = pickContextLine('帮我画一张图');
          return typeof line === 'string' && line.length > 0 ? true : 'no line';
        });
        check('走路帧齐备', () => {
          for (let i = 0; i < 4; i += 1) {
            if (!SPRITES['walk' + i]) return 'walk' + i + ' missing';
          }
          return true;
        });

        fetch(API_BASE + '/selftest', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ v: '__BUILD_VERSION__', results }),
        }).catch(() => {});
      };

      const trigger = (name) => {
        if (!ACTIONS_NAMES.includes(name)) return;
        if (name === 'idle') { setStage(0); setPrompt(false); lastInput.current = Date.now(); }
        forceAt.current = Date.now();
        setForce(name);
        if (name === 'shake') { setShake(true); setTimeout(() => setShake(false), 700); }
        if (name === 'cheer') { setCheer(true); setTimeout(() => setCheer(false), 1400); }
        if (name === 'blink') { setBlink(true); setTimeout(() => setBlink(false), 900); }
        if (name === 'work') { setWorking(true); setTimeout(() => setWorking(false), 3000); }
        if (name === 'escalate') { setStage(fullStageOf()); }
        if (name === 'prompt') { setStage(fullStageOf()); setPrompt(true); reportReminder(); sayEvent('remind', 'remind', 6000); }
        if (name === 'dismiss') { lastInput.current = Date.now(); setPrompt(false); setStage(0); }
        if (name === 'selftest') runSelfTest();
        if (DEBUG && name === 'hit') {
          // 在宠物头顶上方几处取点，看命中的是谁（穿透 pointer-events）
          const w = document.querySelector('.dsh-sitter-wrap');
          const img = document.querySelector('.dsh-sitter-img');
          const res = [];
          if (w && img) {
            const ir = img.getBoundingClientRect();
            for (const dx of [-18, -8, 0, 8, 18]) {
              for (const dy of [-10, -6, -3]) {
                const x = Math.round(ir.left + ir.width / 2 + dx);
                const y = Math.round(ir.top + dy);
                const stack = document.elementsFromPoint(x, y).slice(0, 4).map((el) => {
                  const cs = getComputedStyle(el);
                  return String(el.className || el.tagName).slice(0, 28) + '|' + cs.opacity + '|' + cs.backgroundColor;
                });
                res.push({ x, y, stack });
              }
            }
          }
          fetch(API_BASE + '/diag/report', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ hit: res }),
          }).catch(() => {});
          setSay('已探测头顶');
          setTimeout(() => setSay(''), 2000);
        }
        if (DEBUG && name === 'hidepet') {
          const w = document.querySelector('.dsh-sitter-wrap');
          if (w) { w.style.visibility = 'hidden'; setSay('宠物已隐藏'); }
          setTimeout(() => setSay(''), 2500);
        }
        if (DEBUG && name === 'showpet') {
          const w = document.querySelector('.dsh-sitter-wrap');
          if (w) { w.style.visibility = ''; setSay('宠物已恢复'); }
          setTimeout(() => setSay(''), 2500);
        }
        if (DEBUG && name === 'nothink') {
          // 对照实验：把思考云整个隐藏，看黑线是否消失
          const el = document.querySelector('.dsh-sitter-think');
          if (el) { el.style.display = 'none'; setSay('气泡已隐藏'); }
          else setSay('没找到气泡');
          setTimeout(() => setSay(''), 2500);
        }
        if (DEBUG && name === 'showthink') {
          const el = document.querySelector('.dsh-sitter-think');
          if (el) { el.style.display = ''; setSay('气泡已恢复'); }
          setTimeout(() => setSay(''), 2500);
        }
        if (DEBUG && name === 'dom') {
          // 把宠物那块的 DOM 结构 + 每个子元素的位置吐回宿主，用于定位多余图层
          const wrap = document.querySelector('.dsh-sitter-wrap');
          const info = { wrap: null, children: [] };
          if (wrap) {
            const r = wrap.getBoundingClientRect();
            info.wrap = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), attrs: {} };
            for (const a of wrap.attributes) info.wrap.attrs[a.name] = a.value.slice(0, 40);
            for (const child of wrap.querySelectorAll('*')) {
              const cr = child.getBoundingClientRect();
              const cs = getComputedStyle(child);
              if (cs.display === 'none' || cr.width < 1 || cr.height < 1) continue;
              info.children.push({
                cls: String(child.className || child.tagName).slice(0, 40),
                x: Math.round(cr.left), y: Math.round(cr.top), w: Math.round(cr.width), h: Math.round(cr.height),
                bg: String(cs.backgroundImage || '').slice(0, 30),
                op: cs.opacity,
              });
            }
          }
          fetch(API_BASE + '/diag/report', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ dom: info }),
          }).catch(() => {});
          setSay('DOM 已上报');
          setTimeout(() => setSay(''), 2000);
        }
        if (name === 'diag') {
          const keys = Object.keys(SPRITES).sort();
          const skins = SKIN_IDS.map((id) => ({
            id,
            key: id + '.idle.pac',
            hasSprite: typeof SPRITES[id + '.idle.pac'] === 'string' && SPRITES[id + '.idle.pac'].indexOf('data:image') === 0,
          }));
          const form = currentForm();
          const probe = formSprite(form, 'idle');
          fetch(API_BASE + '/diag/report', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              build: '__BUILD_VERSION__',
              form,
              formSpriteOk: typeof probe === 'string' && probe.indexOf('data:image') === 0,
              outfitForce: RT.outfitForce,
              displayHeight: RT.displayHeight,
              spriteCount: keys.length,
              skins,
              missingSkins: skins.filter((s) => !s.hasSprite).map((s) => s.id),
              hasComposer: !!document.querySelector('textarea, [contenteditable="true"]'),
              wraps: document.querySelectorAll('.dsh-sitter-wrap').length,
              cards: document.querySelectorAll('.dsh-sitter-pcard').length,
              imgLen: (() => {
                const el = document.querySelector('.dsh-sitter-img');
                const bg = el && el.style.backgroundImage;
                return bg ? bg.length : 0;
              })(),
              probeGiftFrame: giftFrame,
              probeDisplayForm: displayForm,
              probeGiftForm: giftRef.current.form,
              probePriorState: priorStateRef.current,
              probeCurForm: currentForm(),
              probeNow: typeof now === 'number' ? now : -1,
              probeLoadedAt: LOADED_AT,
              probeTypingFrameMs: RT.typingFrameMs,
              probeTFrame: RT.typingFrameMs > 0 ? Math.floor((now - LOADED_AT) / RT.typingFrameMs) % 2 : -1,
              bgHash: (() => {
                const el = document.querySelector('.dsh-sitter-img');
                const bg = (el && el.style.backgroundImage) || '';
                let hsh = 5381;
                for (let i = 0; i < bg.length; i += 7) hsh = ((hsh * 33) ^ bg.charCodeAt(i)) >>> 0;
                return hsh.toString(16);
              })(),
              working: document.querySelector('.dsh-sitter-wrap')?.getAttribute('data-working'),
              pose: (() => {
                const w = document.querySelector('.dsh-sitter-wrap');
                const working = w && w.getAttribute('data-working') === '1';
                return working ? 'typing' : 'idle';
              })(),
            }),
          }).catch(() => {});
          setSay('自检已上报');
          setTimeout(() => setSay(''), 2000);
        }
        if (name === 'outfit') {
          const cur = Number(RT.outfitForce);
          const next = (Number.isFinite(cur) ? cur + 1 : 0) % 4;
          fetch(API_BASE + '/config', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ outfits: { force: next } }),
          }).catch(() => {});
          sayOnce('outfit', 2500);
        }
        if (name === 'dragtest') {
          setSay('拖动还在修');
          setTimeout(() => setSay(''), 2000);
        }
        if (name === 'ultra') {
          setUltra(true);
          setTimeout(() => setUltra(false), 8000);
        }
        if (name === 'say') {
          const line = pickContextLine(lastUserRef.current) || pickLine();
          setSay(line || '喝口水吧');
          setTimeout(() => setSay(''), 15000);
        }
        if (name === 'hover') {
          setHover(true);
          fetch(API_BASE + '/stats', { cache: 'no-store' })
            .then((r) => r.json())
            .then((d) => setStats(d))
            .catch(() => {});
          setTimeout(() => setHover(false), 8000);
        }
        setTimeout(() => setForce((f) => (f === name ? null : f)), 3000);
      };
      triggerRef.current = trigger;

      // ================= 状态推导（唯一入口） =================
      const elapsed = now - LOADED_AT;
      let state = elapsed < RT.sleepMs ? 'sleep' : 'idle';
      let fitElapsed = 0;   // 试衣间条带已废弃，保留变量避免大改

      const lastActivity = Math.max(agent ? agent.lastTime || 0 : 0, LOADED_AT);
      const awayLong = now - lastActivity > RT.dozeMs;
      const windowHidden = typeof document !== 'undefined' && document.hidden;
      if (state === 'idle' && !working && !typing && !agentBusy && awayLong && windowHidden) {
        state = 'sleep';
      }

      // 测试强制
      if (force === 'sleep' || force === 'doze') state = 'sleep';
            if (force === 'idle' || force === 'blink' || force === 'work' || force === 'shake' || force === 'cheer' || force === 'attention') state = 'idle';

      OUTFIT_INDEX = RT.outfits ? OUTFIT_RAW : HOODIE_INDEX;


      // 跑步提醒：放下电脑，在输入框上方来回跑
      if (running && stage === 0 && !prompt) {
        const g0 = G();
        return h('div', { className: 'dsh-sitter-runwrap' },
          h('style', null, CSS),
          h('div', {
            className: 'dsh-sitter-runner',
            style: {
              width: g0.w + 'px',
              height: g0.h + 'px',
              backgroundImage: 'url("' + SPRITES['walk' + runFrame] + '")',
              animationDuration: (RT.breakRunMs / Math.max(1, RT.breakRounds)) + 'ms',
              animationIterationCount: RT.breakRounds * 2,
            },
          }),
          h('div', { className: 'dsh-sitter-runbulk' }, RT.breakText),
        );
      }

      // 升级态：铺满视口的遮罩 + 放大后的宠物 + 确认弹窗
      if (stage > 0) {
        const g = G();
        const need = fullScaleOf();
        const capped = Math.min(2 ** stage, need);
        const dismiss = () => {
          lastInput.current = Date.now();
          setPrompt(false);
          setStage(0);
        };
        const veil = h('div', {
          className: 'dsh-sitter-veil',
          onClick: () => { setPrompt(true); reportReminder(); },
        },
          h('div', {
            className: 'dsh-sitter-grow',
            style: {
              width: g.w + 'px',
              height: g.h + 'px',
              transform: 'scale(' + capped + ')',
              backgroundImage: 'url("' + (stage >= fullStageOf() ? SPRITES['angry' + angryFrame] : formSprite(displayForm, 'idle')) + '")',
            },
          }),
          h('style', null, CSS),
          prompt ? h('div', { className: 'dsh-sitter-modal', onClick: (e) => { e.stopPropagation(); dismiss(); } },
            h('div', { className: 'dsh-sitter-modal-title' }, '要认真学习，知道吗？'),
            h('div', { className: 'dsh-sitter-modal-sub' }, '贝草兰在看着你。'),
            h('button', { className: 'dsh-sitter-modal-btn', onClick: dismiss }, '知道了'),
          ) : h('div', { className: 'dsh-sitter-veil-hint' }, '点我一下'),
        );
        if (stage >= fullStageOf()) veil.props['data-crack'] = '1';
        return createPortal ? createPortal(veil, document.body) : veil;
      }
      const workingNow = state === 'idle' && (working || force === 'work');
      const blinking = RT.blink && blink && state === 'idle';
      const attentive = (attention || force === 'attention') && state === 'idle' && !workingNow;

      let imgStyle;
      if (state === 'idle') {
        const form = displayForm;
        // 打字两帧：按 typingFrameMs 交替。第二帧是构建期从第一帧派生的 _f2，
        // 所以每套皮肤/每个季节都自动有同一节奏的"手在敲"，不用逐张出图。
        const tFrame = RT.typingFrameMs > 0
          ? Math.floor((now - LOADED_AT) / RT.typingFrameMs) % 2
          : 0;
        const pose = workingNow
          ? (tFrame ? 'typingB' : 'typing')
          : (blinking ? 'blink' : 'idle');
        const src = spriteFor(dragging || ultra, form, pose);
        imgStyle = { backgroundImage: 'url("' + src + '")' };
      } else {
        imgStyle = { backgroundImage: 'url("' + spriteSleep(dragging || ultra) + '")' };
      }

      CUR_VOICE = voiceOf(displayForm);
      busyRef.current = !!(working || agentBusy);
      priorStateRef.current = stateRef.current;
      stateRef.current = state;
      const lay = LAY();

      // owner 心跳已移到 effect（渲染期 setState 会让两个实例互相判死 → 宠物消失）
      if (dead) return null;



      return h(
        'div',
        {
          ref: wrapRef,
          className: 'dsh-sitter-wrap',
          'data-ready': ready ? '1' : '0',
          'data-state': state,
          'data-working': workingNow ? '1' : '0',
          'data-think': RT.think ? '1' : '0',
          'data-attention': attentive ? '1' : '0',
          'data-shake': shake ? '1' : '0',
          'data-cheer': cheer ? '1' : '0',
          'data-fixed': RT.panelFixed ? '1' : '0',
          'data-free': freePos ? '1' : '0',
          'data-drag': dragging ? '1' : '0',
          'data-snapping': snapping ? '1' : '0',
          onPointerDown: RT.dragEnabled ? onDragStart : undefined,
          'data-dragable': RT.dragEnabled ? '1' : '0',
          style: freePos
            ? { left: freePos.x + 'px', top: freePos.y + 'px', right: 'auto', bottom: 'auto' }
            : undefined,
          'aria-hidden': true,
        },
        h('style', null, CSS),
        h(SeatBrick, { lay }),
        giftFrame >= 0 ? h('div', {
          className: 'dsh-sitter-gift',
          style: { backgroundImage: 'url("' + (SPRITES['gift' + giftFrame] || '') + '")' },
        }) : null,
        h('div', {
          className: 'dsh-sitter-img',
          'data-poke': poke ? '1' : '0',
          onClick: onPoke,
          'data-sleep': state === 'sleep' ? '1' : '0',
          'data-working': workingNow ? '1' : '0',
          style: imgStyle,
        }),
        h('div', {
          className: 'dsh-sitter-card',
          'data-on': hover && RT.hoverCard && state === 'idle' ? '1' : '0',
        },
          h('div', { className: 'dsh-sitter-row' },
            h('i', { className: 'dsh-sitter-icon', style: { backgroundImage: 'url("' + SPRITES.iconCoin + '")' } }),
            h('span', { className: 'dsh-sitter-label' }, '今日已用'),
            h('b', { className: 'dsh-sitter-value' },
              stats && typeof stats.tokens === 'number' ? fmtTokens(stats.tokens) : '—'),
          ),
          h('div', { className: 'dsh-sitter-row' },
            h('i', { className: 'dsh-sitter-icon', style: { backgroundImage: 'url("' + SPRITES.iconClock + '")' } }),
            h('span', { className: 'dsh-sitter-label' }, 'Vibe'),
            h('b', { className: 'dsh-sitter-value' },
              stats && typeof stats.activeMinutes === 'number' ? fmtMins(stats.activeMinutes) : '—'),
          ),
          h('div', { className: 'dsh-sitter-row' },
            h('i', { className: 'dsh-sitter-icon', style: { backgroundImage: 'url("' + SPRITES.iconClock + '")' } }),
            h('span', { className: 'dsh-sitter-label' }, '提醒'),
            h('b', { className: 'dsh-sitter-value' },
              stats && typeof stats.reminders === 'number' ? stats.reminders + ' 次' : '—'),
          ),
          h('div', { className: 'dsh-sitter-row' },
            h('i', { className: 'dsh-sitter-icon', style: { backgroundImage: 'url("' + SPRITES.iconCoin + '")' } }),
            h('span', { className: 'dsh-sitter-label' }, '吉吉币'),
            h('b', { className: 'dsh-sitter-value' },
              stats && stats.coins ? String(stats.coins.balance) : '—'),
          ),
        ),
        h(SayBubble, { text: say, lay }),
        h(ThinkBubble, { lay }),
        h(SleepBubble, { lay }),
        DEBUG ? h('div', { className: 'dsh-sitter-dbg' }, dbg + ' >> ' + CTX_KEYS) : null,
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        try { CTX_KEYS = Object.keys(ctx || {}).join('|'); } catch (e) {}
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'dsh-sitter',
          order: 50,
        }, () => React.createElement(Boundary, null, React.createElement(Sitter))));

        ctx.slots.inject('settings.section', () => {
          ctx.slots.register({ name: 'settings.section', id: 'dsh-sitter-settings', order: 60, label: '贝贝的基地' },
            () => React.createElement(Boundary, null, React.createElement(WardrobePanel)));
        });
      },
    };
  },
});
