# 项目架构图

```mermaid
graph TD
    subgraph "入口层"
        A[index.html<br/>游戏列表页]
        B[game.html<br/>游戏运行页]
    end

    subgraph "列表页模块 src/list/"
        C[main.js<br/>列表渲染 / 搜索过滤<br/>卡片点击 → 新标签页]
        D[style.css<br/>网格布局 / 卡片样式]
    end

    subgraph "游戏页模块 src/game/"
        E[main.js<br/>生命周期管理<br/>URL解析 / 启动流程]
        F[emulator.js<br/>jsnes 封装<br/>帧循环 / 音频 / 输入]
        G[input.js<br/>按键映射<br/>默认配置 / 冲突检测]
        H[keybinding-ui.js<br/>设置面板 UI<br/>按键重新绑定]
        I[style.css<br/>Canvas布局 / 面板样式]
    end

    subgraph "共享模块 src/shared/"
        J[storage.js<br/>localStorage 封装<br/>loadKeyBindings<br/>saveKeyBindings<br/>resetKeyBindings]
    end

    subgraph "外部依赖"
        K[jsnes@1.2.1<br/>NES 模拟核心]
        L[ROM 文件<br/>roms/*.nes<br/>88 款游戏]
        M[localStorage<br/>浏览器存储]
        N[Canvas API<br/>画面渲染]
        O[Web Audio API<br/>音频输出]
    end

    subgraph "测试"
        P[tests/unit/<br/>input.test.js<br/>storage.test.js]
        Q[tests/e2e/<br/>list.spec.js<br/>game.spec.js]
    end

    A --> C
    A --> D
    C --> J
    C -->|window.open| B
    B --> E
    B --> I
    E --> F
    E --> G
    E --> H
    G --> J
    F --> K
    F --> N
    F --> O
    E --> L
    J --> M
    H --> G
    P --> G
    P --> J
    Q --> A
    Q --> B
```

## 数据流图

```mermaid
sequenceDiagram
    participant Player as 玩家
    participant ListPage as index.html<br/>列表页
    participant GamePage as game.html<br/>游戏页
    participant Emulator as emulator.js<br/>模拟器核心
    participant Storage as localStorage

    Player->>ListPage: 打开网站
    ListPage->>ListPage: 扫描 roms/ 目录<br/>渲染游戏卡片网格
    Player->>ListPage: 搜索/浏览游戏
    ListPage->>ListPage: 实时过滤卡片
    Player->>ListPage: 点击游戏卡片
    ListPage->>GamePage: window.open('game.html?rom=...')

    GamePage->>GamePage: 解析 URL 参数<br/>显示启动确认面板
    GamePage->>Storage: loadKeyBindings(gameId)
    Storage-->>GamePage: 自定义配置 或 null

    Player->>GamePage: 点击"投币"
    GamePage->>Emulator: buttonDown/Up(Select)
    Player->>GamePage: 点击"开始"
    GamePage->>Emulator: 加载 ROM → start()
    Emulator->>Emulator: requestAnimationFrame 循环<br/>60fps 帧渲染 + 音频输出

    Player->>GamePage: 打开按键设置
    GamePage-->>Player: 显示当前映射面板
    Player->>GamePage: 修改映射 → 保存
    GamePage->>Storage: saveKeyBindings(gameId, bindings)

    Player->>GamePage: 关闭标签页
    GamePage->>Emulator: stop() 释放资源
```

## 模块依赖关系

```mermaid
graph LR
    subgraph "Phase 2 基础设施"
        S[storage.js] --> LS[localStorage]
    end

    subgraph "Phase 3 US1 核心"
        LM[list/main.js] --> S
        LM --> ROM[roms/*.nes]
        GM[game/main.js] --> EM[emulator.js]
        EM --> jsnes[jsnes]
        EM --> Canvas[Canvas API]
        EM --> Audio[Web Audio API]
        GM --> S
        GM --> ROM
    end

    subgraph "Phase 4 US2 按键"
        IN[input.js] --> S
        KB[keybinding-ui.js] --> IN
        GM --> IN
        GM --> KB
    end

    subgraph "Phase 5 US3 搜索"
        LM -->|新增搜索过滤| LM
    end

    style S fill:#4a9,stroke:#333
    style EM fill:#e44,stroke:#333
    style IN fill:#e84,stroke:#333
```

## 构建输出

```mermaid
graph TD
    subgraph "Vite 构建"
        V[vite.config.js<br/>多页面入口]
        V -->|入口1| I1[index.html → dist/index.html]
        V -->|入口2| I2[game.html → dist/game.html]
        V -->|静态资源| R[roms/ → dist/roms/]
    end

    subgraph "输出 dist/"
        O1[dist/index.html<br/>+ list/main.js<br/>+ list/style.css]
        O2[dist/game.html<br/>+ game/main.js<br/>+ game/emulator.js<br/>+ game/input.js<br/>+ game/keybinding-ui.js<br/>+ game/style.css]
        O3[dist/roms/*.nes<br/>88 个 ROM 文件]
        O4[dist/shared/storage.js]
    end

    I1 --> O1
    I2 --> O2
    R --> O3
    O1 --> O4
    O2 --> O4
```
