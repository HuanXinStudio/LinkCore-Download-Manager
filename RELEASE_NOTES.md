# LinkCore 下载管理器 发布说明

## [1.2.0] - 2025-12-09

### 核心修改

#### 1. 移除系统弹窗，使用自定义弹窗
- **文件**：`src/main/core/UpdateManager.js`
- **修改**：移除所有`dialog.showMessageBox`调用
- **效果**：所有更新提示使用自定义对话框，保持一致的用户体验

#### 2. 自动更新下载功能
- **文件**：`src/main/core/UpdateManager.js`
- **修改**：检测到更新时自动开始下载
- **效果**：简化更新流程，减少用户交互步骤

#### 3. 增强的IPC事件通信
- **文件**：`src/main/core/UpdateManager.js`
- **修改**：完善更新状态事件发送，包含新版本号
- **事件**：`update-available`、`update-not-available`、`update-downloaded`、`update-error`
- **效果**：渲染进程可监听事件并显示自定义弹窗

#### 4. 版本按钮增强
- **文件**：`src/renderer/components/Subnav/PreferenceSubnav.vue`
- **修改**：检测到新版本时显示"新版本 X.X.X"格式
- **效果**：用户可直观看到可用的更新版本号

#### 5. 版本按钮闪烁效果
- **文件**：`src/renderer/components/Subnav/PreferenceSubnav.vue`
- **修改**：添加绿色脉冲动画
- **效果**：有新版本时按钮变为绿色并闪烁，吸引用户注意

#### 6. 版本按钮边框优化
- **文件**：`src/renderer/components/Subnav/PreferenceSubnav.vue`
- **修改**：增加border-radius值，从4px改为12px
- **效果**：按钮边框四个角更平滑，视觉效果更好

#### 7. 代码质量优化
- **修改**：运行`eslint`检查，确保代码符合规范
- **效果**：优化事件处理，避免内存泄漏，增强错误处理

### 变更日志

#### 新增功能
- 自动更新下载功能
- 增强的IPC事件通信，包含新版本号传递
- 自定义对话框支持
- 版本按钮显示新版本号功能
- 版本按钮绿色闪烁效果

#### 修复问题
- 移除了不一致的系统弹窗
- 修复了潜在的内存泄漏

#### 改进优化
- 简化了更新流程
- 提高了用户体验
- 改进了代码可维护性
- 增强了版本更新提示的视觉效果
- 提供了更直观的版本信息展示
- 优化了版本按钮的边框圆角，使视觉效果更平滑

### 贡献者
- HuanXinStudio - 主导开发者