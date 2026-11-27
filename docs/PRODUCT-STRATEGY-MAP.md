# Product strategy → what's built

Maps the "Poker Performance OS" strategy document to the app. ✅ built · 🟡 partial · ⏳ planned.

## Core loop: Record → Understand → Improve → Plan → Play

| Strategy item                                                              | Status | Where                                                                                                                |
| -------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Zero-friction session tracking, smart defaults (#13, #22, #92)             | ✅     | Start session pre-fills your usual game + buy-in (`lib/insights/smart-defaults`)                                     |
| "Playing tonight?" context (#93)                                           | ✅     | Today card on your usual weekday/hour, one tap to start                                                              |
| Smart session start: bankroll rule check (#16, #94)                        | ✅     | Start sheet: within / above your rule, override allowed ("Start anyway")                                             |
| Smart session end + immediate reward (#95–97)                              | ✅     | Session report: result counts up, hourly, vs 30-day average, badges, variance note                                   |
| Emotion tracking (#53) + correlation (#137)                                | ✅     | Mood 😀→😡 in the session report; "Frustrated sessions cost you" insight                                             |
| Don't-tilt system / "outside your normal pattern" (#15, #54)               | ✅     | Live session: re-buys, length vs your normal, stake above usual, down 3+ buy-ins, late night, moving up after a loss |
| Stop rules (#55)                                                           | ✅     | Stop-loss + max length (Phase 1)                                                                                     |
| Personal insights, "Here's what I noticed", the one thing (#9, #122, #139) | ✅     | Today card (rotates top 3) + Progress list (`lib/insights/engine`)                                                   |
| Sample-size intelligence (#26) and "associated with, not causes" (#138)    | ✅     | Every insight has Small sample / Moderate / High confidence; wording is associative                                  |
| Stake / weekday / time-of-day / session-length / venue analysis (#47–52)   | ✅     | Insight engine                                                                                                       |
| Position heatmap (#48)                                                     | ✅     | Progress → By position (logged hands, bb/hand)                                                                       |
| Anomaly detection (#112)                                                   | ✅     | Buy-in or session length up ≥35% this month                                                                          |
| "Biggest lesson" / loss concentration (#111)                               | ✅     | Insight + monthly report                                                                                             |
| Form + variance education (#107–108)                                       | ✅     | Form insight ("10 sessions is mostly variance"), variance note on losing sessions                                    |
| Personal poker story (#7)                                                  | ✅     | Progress → Your poker journey                                                                                        |
| Weekly report (#31)                                                        | ✅     | Weekly report card + review prompts (Phase 3)                                                                        |
| Monthly report vs last month (#32)                                         | ✅     | Journey → Monthly report                                                                                             |
| Year in poker + share card (#33–34)                                        | ✅     | Journey → Share my year (amounts optional)                                                                           |
| Multi-bankroll + total net worth (#11)                                     | ✅     | Bankroll → Bankroll intelligence                                                                                     |
| Multi-currency with stored rates (#12)                                     | ✅     | Since Phase 1                                                                                                        |
| Risk of ruin (#18)                                                         | ✅     | Bankroll intelligence (plain-language band + %)                                                                      |
| Bankroll forecast (#17, #109–110)                                          | ✅     | 1/3/6-month range from your own results resampled (10th/50th/90th)                                                   |
| Stakes management / move-up readiness (#44)                                | ✅     | Stake ladder (Phase 3)                                                                                               |
| Tournament mode + performance map (#45–46)                                 | ✅     | Tournament ROI/ITM by buy-in                                                                                         |
| Fast hand logging (#19–21)                                                 | ✅     | Express log + full table (Phase 2)                                                                                   |
| Player database, live profiles, fact vs assumption (#23–25)                | ✅     | Hands → Players: style, reads with evidence (+1 per sighting), record vs player, shared hands                        |
| Data export / portability (#86)                                            | ✅     | CSV + full JSON (now incl. hands, Leak Book, players)                                                                |
| Privacy, RLS, deletion (#87)                                               | ✅     | Since Phase 0                                                                                                        |
| Responsible gambling (#116)                                                | ✅     | Bankroll rule, stop rules, pattern check, responsible-gaming page                                                    |

## Not yet

| Item                                                                       | Status     | Note                                                                                    |
| -------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| AI hand review, session debrief, weekly AI coach, "Ask your data" (#35–41) | ⏳ Phase 4 | Needs the AI provider decision + key. Will be grounded in the insight engine's data.    |
| Leak detection with bb/100 impact from full hand histories (#27)           | 🟡         | Leak Book + position/insights today; full stat-based leaks need imported hand histories |
| Notification modes Minimal / Standard / Coach (#89)                        | ⏳         | Reminders exist; modes next                                                             |
| Onboarding goal → personalised home (#120–121)                             | ⏳         |                                                                                         |
| Poker Health score (#106)                                                  | ⏳         |                                                                                         |
| Social groups, coach mode, staking, marketplace (#56–61)                   | ⏳ Later   |                                                                                         |
| Online hand-history import (#62)                                           | ⏳ Later   |                                                                                         |
| Subscriptions (#78–83)                                                     | ⏳ Phase 5 |                                                                                         |
