# NPC权重评分系统 实施计划

- [x] 1. 在 `NpcSoulCard` 类型中添加 `weight` 字段
- [x] 2. 更新 `genesisPrompt.ts`：创世AI生成初始权重评分指令
- [x] 3. 更新 `genesisProtocol.ts`：解析 weight 字段
- [x] 4. 更新 `formatNpcSoulCards.ts`：在prompt中展示weight
- [x] 5. 更新 `playPrompt.ts`：加入权重分级描写规则
- [x] 6. 更新 `playOpeningPrompt.ts`：加入权重分级描写规则
- [x] 7. 在 `play.ts` 中添加权重动态调整函数
- [x] 8. 更新 `GamePlayer.tsx`：每回合结束后调用权重更新
- [x] 9. 更新 `storage/types.ts`：持久化NPC权重数据
