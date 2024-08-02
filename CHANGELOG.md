# Changelog

## [7.0.1](https://github.com/fasenderos/hft-limit-order-book/compare/v7.0.0...v7.0.1) (2024-08-02)


### Features

* add error codes ([5a538d5](https://github.com/fasenderos/hft-limit-order-book/commit/5a538d59160e608cb7bffb245295a5543a8aacb3))
* add postOnly option on deprecated createOrder signature ([e1b5825](https://github.com/fasenderos/hft-limit-order-book/commit/e1b5825e6f061e7cfc5c99800f564879cb84862e))


### Documentation

* improve post-only documentation ([1383eef](https://github.com/fasenderos/hft-limit-order-book/commit/1383eef5a7b8797f3c0998bff01b5f870508c642))

## [7.0.0](https://github.com/fasenderos/hft-limit-order-book/compare/v6.1.1...v7.0.0) (2024-08-02)


### ⚠ BREAKING CHANGES

* - The `isMaker` property has been removed from the limit order object.
- New properties `takerQty` and `makerQty` have been added to the limit order objecct.

### Features

* add postOnly limit order option ([4dd8d69](https://github.com/fasenderos/hft-limit-order-book/commit/4dd8d693c84cd6ebb5285f8f5be84864bcb8f001))
* taker and maker support + fix origSize on limit order ([74f5907](https://github.com/fasenderos/hft-limit-order-book/commit/74f59077913a25c7ff742c0a0e3a1f87f3799191))


### Documentation

* add postOnly documentation ([a9758cf](https://github.com/fasenderos/hft-limit-order-book/commit/a9758cf66c0520b42ce4ea612838a3b3b10b1d91))
* fix link in readme ([def26de](https://github.com/fasenderos/hft-limit-order-book/commit/def26dedc4f8c33bf4629fe7bdcac3496836fb7b))
* fix link in readme ([663f9b2](https://github.com/fasenderos/hft-limit-order-book/commit/663f9b2f2e513b48d119e6fb3c0eb652b4a08417))
* fix link in readme ([c32bed1](https://github.com/fasenderos/hft-limit-order-book/commit/c32bed12594e5e3ed691de8b78f4d74fb0379885))


### Refactoring

* custom error factory ([e99766e](https://github.com/fasenderos/hft-limit-order-book/commit/e99766e79c372276adbca90db37a36a87a47bcd7))

## [6.1.1](https://github.com/fasenderos/hft-limit-order-book/compare/v6.1.0...v6.1.1) (2024-08-01)


### Chore

* **deps-dev:** bump @commitlint/config-conventional ([ef84160](https://github.com/fasenderos/hft-limit-order-book/commit/ef84160c64203943f383d20b8b43b81342731a02))
* **deps-dev:** bump tap from 19.2.5 to 21.0.0 ([d759984](https://github.com/fasenderos/hft-limit-order-book/commit/d759984f18827b617320341e4d0373d4aa6df2bd))


### Documentation

* improved visibility of experimental features ([6a7efb8](https://github.com/fasenderos/hft-limit-order-book/commit/6a7efb82d251994697ed1785732205216cb61185))

## [6.1.0](https://github.com/fasenderos/hft-limit-order-book/compare/v6.1.0-beta.1...v6.1.0) (2024-08-01)


### Features

* new experimentalConditionalOrders order book option ([55d3e11](https://github.com/fasenderos/hft-limit-order-book/commit/55d3e11b4b486391c4f9f4647d90d14af3712623))


### Chore

* **deps-dev:** bump husky from 9.1.1 to 9.1.2 ([282843a](https://github.com/fasenderos/hft-limit-order-book/commit/282843ac5aa18f1875e0f0c3c189557910cfd0f8))
* **deps-dev:** bump husky from 9.1.2 to 9.1.3 ([5f82ba5](https://github.com/fasenderos/hft-limit-order-book/commit/5f82ba5e732987ac05315822002291461ffb966b))
* **deps-dev:** bump husky from 9.1.3 to 9.1.4 ([5d5fbc5](https://github.com/fasenderos/hft-limit-order-book/commit/5d5fbc5d30ec809b041580b02e2ed30b4ed6a219))
* **deps-dev:** bump typescript from 5.5.3 to 5.5.4 ([809a7ab](https://github.com/fasenderos/hft-limit-order-book/commit/809a7abb3beef55ee034d1b07ba26e4ffdabf674))


### Documentation

* update readme ([95dcf42](https://github.com/fasenderos/hft-limit-order-book/commit/95dcf429f05defcdf5ad45b2877fc10311fc7041))

## [6.1.0-beta.1](https://github.com/fasenderos/hft-limit-order-book/compare/v6.1.0-beta.0...v6.1.0-beta.1) (2024-07-28)


### Features

* add support for OCO orders ([5b19318](https://github.com/fasenderos/hft-limit-order-book/commit/5b193185b5e32ba6d0ad9d0853876708e3c3e23c))


### Bug Fixes

* use new signatures in benchmark script ([313aefe](https://github.com/fasenderos/hft-limit-order-book/commit/313aefe3cebef6dd9876e7b9828cdfc54db33f1a))


### Chore

* update husky script ([2e7dd67](https://github.com/fasenderos/hft-limit-order-book/commit/2e7dd678975974a90ebb2921193b6c24b152d67e))


### Documentation

* add stop limit and stop market documentations ([41ef939](https://github.com/fasenderos/hft-limit-order-book/commit/41ef939d172ea7f1a93e1e481f1dcffcbca55640))


### Refactoring

* improve code readability on cancelOrder ([9f062c4](https://github.com/fasenderos/hft-limit-order-book/commit/9f062c44d9d490e872c4f8c16287a7140fd1481c))

## [6.1.0-beta.0](https://github.com/fasenderos/hft-limit-order-book/compare/v5.0.0...v6.1.0-beta.0) (2024-07-22)


### Features

* add getter for market price ([9f4b315](https://github.com/fasenderos/hft-limit-order-book/commit/9f4b315fac7b94325fa4f13bc6eb7d30afee2058))
* add support for stop limit and stop market order ([92f9441](https://github.com/fasenderos/hft-limit-order-book/commit/92f9441b18593073b146cbe1456d77f8d06e1e20))
* refactor limit and market options ([794c71a](https://github.com/fasenderos/hft-limit-order-book/commit/794c71ac4c3eda212cb11b36c32b5f9f60c99caa))


### Chore

* **deps-dev:** bump @commitlint/cli from 18.6.1 to 19.3.0 ([8695b5b](https://github.com/fasenderos/hft-limit-order-book/commit/8695b5b4ec49d60d4fb1c00aa55968402ebc7ac2))
* **deps-dev:** bump husky from 9.0.11 to 9.1.0 ([c8da2e2](https://github.com/fasenderos/hft-limit-order-book/commit/c8da2e202bd0782a656e430c02e0925b547e7f9d))
* **deps-dev:** bump husky from 9.1.0 to 9.1.1 ([47bb2f8](https://github.com/fasenderos/hft-limit-order-book/commit/47bb2f8225fb66d01632f635b04165de06467713))
* **deps-dev:** bump release-it from 17.3.0 to 17.4.0 ([ec5349b](https://github.com/fasenderos/hft-limit-order-book/commit/ec5349b6521a28e65026209a3e18f7cf72ceb92a))
* **deps-dev:** bump release-it from 17.4.0 to 17.4.1 ([beac954](https://github.com/fasenderos/hft-limit-order-book/commit/beac954283422f539c13d1ec4735e13dd028b3bd))
* **deps-dev:** bump release-it from 17.4.1 to 17.4.2 ([ddad1df](https://github.com/fasenderos/hft-limit-order-book/commit/ddad1df79fe300b44b8c350b1a8daa12fd8e1187))
* **deps-dev:** bump release-it from 17.4.2 to 17.5.0 ([4d8f10e](https://github.com/fasenderos/hft-limit-order-book/commit/4d8f10e0fa30e85a50b93a4a2466a1e9e4441580))
* **deps-dev:** bump release-it from 17.5.0 to 17.6.0 ([a6f7ba3](https://github.com/fasenderos/hft-limit-order-book/commit/a6f7ba3758150131b5a1f39fb9919ef380b7fb06))
* **deps-dev:** bump tap from 18.7.3 to 19.2.5 ([f09af63](https://github.com/fasenderos/hft-limit-order-book/commit/f09af6399c83a7a6880802bc72514ad29364ba8b))
* **deps-dev:** bump typescript from 5.4.5 to 5.5.2 ([999dfca](https://github.com/fasenderos/hft-limit-order-book/commit/999dfcaec02be747731b16c109b310269599cd23))
* **deps-dev:** bump typescript from 5.5.2 to 5.5.3 ([8402f83](https://github.com/fasenderos/hft-limit-order-book/commit/8402f83b4f98924c26ed69f39aab75c625426529))
* **deps-dev:** bump webpack from 5.92.1 to 5.93.0 ([8468d06](https://github.com/fasenderos/hft-limit-order-book/commit/8468d066a61201364fb4cb18723a2af1fc9b271e))
* **release:** hft-limit-order-book@5.1.0-beta.0 ([770721b](https://github.com/fasenderos/hft-limit-order-book/commit/770721b06d75c9255827e3bc06ce570c953986da))


### Documentation

* fix snapshot example ([073ca07](https://github.com/fasenderos/hft-limit-order-book/commit/073ca075ce673959808932f4adc26629b9641535))
* improve snapshot and journal documentation ([3ba2d05](https://github.com/fasenderos/hft-limit-order-book/commit/3ba2d057ed14f979a287508434e3f7c83725b119))
* new features snapshot and journaling ([442dc43](https://github.com/fasenderos/hft-limit-order-book/commit/442dc4314e637632554369e8e4af0a425b591a82))
* update new signatures method + add stop limit and stop market ([96408a0](https://github.com/fasenderos/hft-limit-order-book/commit/96408a05b988b8597168e1b2c99b5e45fc88204d))


### Test

* add test for stop limit and stop market order ([47e6f5e](https://github.com/fasenderos/hft-limit-order-book/commit/47e6f5e9deaaf4ade4289955ef456884f53d506e))

## [5.0.0](https://github.com/fasenderos/hft-limit-order-book/compare/v4.0.0...v5.0.0) (2024-06-19)


### Features

* add enableJournaling option and replayJournal functionality ([f451c50](https://github.com/fasenderos/hft-limit-order-book/commit/f451c5077df72fabbca4526f26bf750668348fdd))
* avoid restoring same order twice ([483eef9](https://github.com/fasenderos/hft-limit-order-book/commit/483eef928a81d60eafdfa75961e709bb4ce7df0e))
* snapshot and restore functionality + add origSize to Order ([7d09059](https://github.com/fasenderos/hft-limit-order-book/commit/7d0905976d3b118e35fba31e4923b6a6ea4d219a))


### Chore

* **deps-dev:** bump @commitlint/cli from 18.6.0 to 18.6.1 ([f8193db](https://github.com/fasenderos/hft-limit-order-book/commit/f8193db3f50eec2d1a70a742b1e106c4dee9d6d2))
* **deps-dev:** bump @commitlint/config-conventional ([f4745e6](https://github.com/fasenderos/hft-limit-order-book/commit/f4745e67b7766c10c31c271ae911777fe7b6c54b))
* **deps-dev:** bump @commitlint/config-conventional ([7972796](https://github.com/fasenderos/hft-limit-order-book/commit/797279684b1af3799e01d8c25b5c9bd5c7572d36))
* **deps-dev:** bump braces from 3.0.2 to 3.0.3 ([7231418](https://github.com/fasenderos/hft-limit-order-book/commit/72314189c4b067502f017a7b52c0bd1d5d0f3196))
* **deps-dev:** bump husky from 9.0.10 to 9.0.11 ([67041f9](https://github.com/fasenderos/hft-limit-order-book/commit/67041f9d1cea29f2bca233cc5077a551f0170a14))
* **deps-dev:** bump husky from 9.0.6 to 9.0.7 ([31e04c6](https://github.com/fasenderos/hft-limit-order-book/commit/31e04c631af549b68416decda39112d77f6215e9))
* **deps-dev:** bump husky from 9.0.7 to 9.0.10 ([3313c37](https://github.com/fasenderos/hft-limit-order-book/commit/3313c37bd8c106673efe08a85dd6f696efed927d))
* **deps-dev:** bump ip from 2.0.0 to 2.0.1 ([1920277](https://github.com/fasenderos/hft-limit-order-book/commit/192027787c5aef9b3b0419fdae4b364379d44178))
* **deps-dev:** bump release-it from 17.0.3 to 17.0.5 ([886630e](https://github.com/fasenderos/hft-limit-order-book/commit/886630e29a65f2dd15d85c8ed87ccb9066431152))
* **deps-dev:** bump release-it from 17.0.5 to 17.1.1 ([5dd483a](https://github.com/fasenderos/hft-limit-order-book/commit/5dd483a2093dcd370567276e3c2650709dd32912))
* **deps-dev:** bump release-it from 17.1.1 to 17.2.0 ([fae5e69](https://github.com/fasenderos/hft-limit-order-book/commit/fae5e69ecc9b9bfe6606f4a5ef7fd4591ec8fac4))
* **deps-dev:** bump release-it from 17.2.0 to 17.2.1 ([4a98f82](https://github.com/fasenderos/hft-limit-order-book/commit/4a98f82494cca909cc8f512482d240b44700fdcf))
* **deps-dev:** bump release-it from 17.2.1 to 17.3.0 ([75a65f8](https://github.com/fasenderos/hft-limit-order-book/commit/75a65f8329dc1a410d5c639e5a19f687d7d9c77a))
* **deps-dev:** bump tap from 18.7.0 to 18.7.1 ([03d1588](https://github.com/fasenderos/hft-limit-order-book/commit/03d1588f89389300cd1e673d9efa246da7f71d01))
* **deps-dev:** bump tap from 18.7.1 to 18.7.2 ([dc871c0](https://github.com/fasenderos/hft-limit-order-book/commit/dc871c090c2ce471b56da92b7b012f779db03860))
* **deps-dev:** bump tap from 18.7.2 to 18.7.3 ([b0ec86d](https://github.com/fasenderos/hft-limit-order-book/commit/b0ec86d0ae31c4bc573a7ef9ab165c1481e2ee20))
* **deps-dev:** bump typescript from 5.3.3 to 5.4.2 ([4cec012](https://github.com/fasenderos/hft-limit-order-book/commit/4cec012d271d6e429f67cb24e2ff983010cfa2b6))
* **deps-dev:** bump typescript from 5.4.2 to 5.4.3 ([075fd42](https://github.com/fasenderos/hft-limit-order-book/commit/075fd421ab1641e1c13d9f6a5c98741f5939a30d))
* **deps-dev:** bump typescript from 5.4.3 to 5.4.4 ([9b2918a](https://github.com/fasenderos/hft-limit-order-book/commit/9b2918a1d93c8e5aaac1f0b14251f46a6fb08fa6))
* **deps-dev:** bump typescript from 5.4.4 to 5.4.5 ([a639640](https://github.com/fasenderos/hft-limit-order-book/commit/a63964014cea3e5d8b6782d68de980135e111af8))
* **deps-dev:** bump webpack from 5.90.0 to 5.90.1 ([68efd0a](https://github.com/fasenderos/hft-limit-order-book/commit/68efd0a62483fd6b79f7b4ce64ce87f5ca188a44))
* **deps-dev:** bump webpack from 5.90.1 to 5.90.2 ([1387ff2](https://github.com/fasenderos/hft-limit-order-book/commit/1387ff24315e9a67b6e3358f61aaaa2e385664e2))
* **deps-dev:** bump webpack from 5.90.2 to 5.90.3 ([0ce68d3](https://github.com/fasenderos/hft-limit-order-book/commit/0ce68d3a084bf92ddda74ae8de29e09515a78752))
* **deps-dev:** bump webpack from 5.90.3 to 5.91.0 ([b3cbc36](https://github.com/fasenderos/hft-limit-order-book/commit/b3cbc36ac38dc65976d8ebdb4fc5392c1f21d2ad))
* **deps-dev:** bump webpack from 5.91.0 to 5.92.0 ([7659d4a](https://github.com/fasenderos/hft-limit-order-book/commit/7659d4ad579b3c5499d0b3ce2d924d60e4024828))
* **deps-dev:** bump webpack from 5.92.0 to 5.92.1 ([f6018fa](https://github.com/fasenderos/hft-limit-order-book/commit/f6018faf77c8a004fde5a8bffc8951b8787b25a7))
* **deps-dev:** bump ws from 8.17.0 to 8.17.1 ([a0cfe03](https://github.com/fasenderos/hft-limit-order-book/commit/a0cfe03f225975b05625e27153403911264eb413))


### Documentation

* documented new journal and snapshot features ([60f9434](https://github.com/fasenderos/hft-limit-order-book/commit/60f9434172395223ef745a3753c6527507cef1cc))
* improve documentation with better examples ([80bfbca](https://github.com/fasenderos/hft-limit-order-book/commit/80bfbcacb95a86ad96b0c9a4ba487e8928f7aaef))

## [4.0.0](https://github.com/fasenderos/hft-limit-order-book/compare/v3.0.0...v4.0.0) (2024-01-27)


### Bug Fixes

* modify size under the price-time-priority ([32cfe04](https://github.com/fasenderos/hft-limit-order-book/commit/32cfe047070bc4cfd8f3f6c2b8512866a90b7512)), closes [#336](https://github.com/fasenderos/hft-limit-order-book/issues/336)


### Chore

* **deps-dev:** bump husky from 8.0.3 to 9.0.6 ([a39deda](https://github.com/fasenderos/hft-limit-order-book/commit/a39deda622c7c6d9cee650c32ee053144a9d192c))
* **deps-dev:** bump tap from 18.6.1 to 18.7.0 ([b8eb10e](https://github.com/fasenderos/hft-limit-order-book/commit/b8eb10edfa34760bd1bd45b19008d4dfb434af8f))


### Test

* modify order now return IProcessOrder ([838234b](https://github.com/fasenderos/hft-limit-order-book/commit/838234b53f4f63510f84943735e09d891f15fdf1))

## [3.0.0](https://github.com/fasenderos/hft-limit-order-book/compare/v2.3.5...v3.0.0) (2024-01-26)


### ⚠ BREAKING CHANGES

* modify order price that cross the market price

### Bug Fixes

* modify order price that cross the market price ([32413ae](https://github.com/fasenderos/hft-limit-order-book/commit/32413ae174f56edcaafa2263773f2a6cc66e66f9)), closes [#336](https://github.com/fasenderos/hft-limit-order-book/issues/336)
* uinqueID -> uniqueID ([3868529](https://github.com/fasenderos/hft-limit-order-book/commit/3868529ef070abb65376f7f69e48f1b9b0540c20))


### Chore

* **deps-dev:** bump @commitlint/cli from 17.7.1 to 17.7.2 ([d16ea04](https://github.com/fasenderos/hft-limit-order-book/commit/d16ea04472664bc686335665f5932a0997051e58))
* **deps-dev:** bump @commitlint/cli from 17.7.2 to 17.8.0 ([e7b2058](https://github.com/fasenderos/hft-limit-order-book/commit/e7b2058907369c5a193081c73c1280e68b79486a))
* **deps-dev:** bump @commitlint/cli from 17.8.0 to 18.5.0 ([1612715](https://github.com/fasenderos/hft-limit-order-book/commit/161271589bea823bee063e18b6326902ff006142))
* **deps-dev:** bump @commitlint/cli from 18.5.0 to 18.6.0 ([cbda5fd](https://github.com/fasenderos/hft-limit-order-book/commit/cbda5fdf30d85586b3ccb15e5bdb776ee881805e))
* **deps-dev:** bump @commitlint/config-conventional ([1bc900e](https://github.com/fasenderos/hft-limit-order-book/commit/1bc900e070f5b7aef1187ff27b8107d07e95bf11))
* **deps-dev:** bump @commitlint/config-conventional ([860278a](https://github.com/fasenderos/hft-limit-order-book/commit/860278ab24a3c8b0cc873a2cc5cf70017024f4e6))
* **deps-dev:** bump @commitlint/config-conventional ([ab2a574](https://github.com/fasenderos/hft-limit-order-book/commit/ab2a574e40831ef09efe6b6e80b8c9599cefd8b6))
* **deps-dev:** bump @release-it/conventional-changelog ([15225bd](https://github.com/fasenderos/hft-limit-order-book/commit/15225bd0f47c16c61eaab6675d663ccf9a4a43f5))
* **deps-dev:** bump @release-it/conventional-changelog ([398e465](https://github.com/fasenderos/hft-limit-order-book/commit/398e465b010711c8021213c8aedd1637e4d5e7e9))
* **deps-dev:** bump @types/functional-red-black-tree ([207416a](https://github.com/fasenderos/hft-limit-order-book/commit/207416a3ae5d12e8ee15b405c25815fb1289b04c))
* **deps-dev:** bump @types/functional-red-black-tree ([3ca4f99](https://github.com/fasenderos/hft-limit-order-book/commit/3ca4f99cdead19663258ca8310ddf90055c262da))
* **deps-dev:** bump @types/tap from 15.0.8 to 15.0.9 ([07be7ba](https://github.com/fasenderos/hft-limit-order-book/commit/07be7bacb8cfeddaab385b765d7234ef4268552d))
* **deps-dev:** bump release-it and @release-it/conventional-changelog ([00976a8](https://github.com/fasenderos/hft-limit-order-book/commit/00976a8e09caf41a9fad1dcb65e5cf692b4ce6d0))
* **deps-dev:** bump release-it from 16.1.5 to 16.2.0 ([e31a216](https://github.com/fasenderos/hft-limit-order-book/commit/e31a2168ff11555e7e89338b666cacdeb3aac041))
* **deps-dev:** bump release-it from 16.2.0 to 16.2.1 ([d6745d2](https://github.com/fasenderos/hft-limit-order-book/commit/d6745d296fbc86cd557c4282c498120421f5ae1e))
* **deps-dev:** bump release-it from 16.2.1 to 16.3.0 ([952ceb9](https://github.com/fasenderos/hft-limit-order-book/commit/952ceb925ab862fb5ec6d642d53516b3058157e4))
* **deps-dev:** bump ts-loader from 9.4.4 to 9.5.0 ([c43647f](https://github.com/fasenderos/hft-limit-order-book/commit/c43647f99056ead8b34cf0e76b06ea5179ebae55))
* **deps-dev:** bump ts-loader from 9.5.0 to 9.5.1 ([bba4126](https://github.com/fasenderos/hft-limit-order-book/commit/bba4126f009546b8dbc4ea461772caa3369c649a))
* **deps-dev:** bump ts-node from 10.9.1 to 10.9.2 ([654ed04](https://github.com/fasenderos/hft-limit-order-book/commit/654ed0438a626ea4f5b9202c971c42bdaa73c44f))
* **deps-dev:** bump typescript from 5.1.6 to 5.2.2 ([2f9f4a8](https://github.com/fasenderos/hft-limit-order-book/commit/2f9f4a83a2d8987f01727c57c6370fb595d7f5a7))
* **deps-dev:** bump typescript from 5.2.2 to 5.3.3 ([ed4e996](https://github.com/fasenderos/hft-limit-order-book/commit/ed4e996bbc521fe9827126d6a859b627d5c7f3e5))
* **deps-dev:** bump webpack from 5.88.2 to 5.89.0 ([df98376](https://github.com/fasenderos/hft-limit-order-book/commit/df98376e15975ac0650742152750ae0e82d21cce))
* **deps-dev:** bump webpack from 5.89.0 to 5.90.0 ([6783c66](https://github.com/fasenderos/hft-limit-order-book/commit/6783c66ffd89f5a7cc15cdb531de68619e0e6a6a))
* **deps:** bump bignumber.js from 9.1.1 to 9.1.2 ([929acfb](https://github.com/fasenderos/hft-limit-order-book/commit/929acfbd8ae889bc128e91bd7df23dec513ccc13))


### Documentation

* fix typo ([96f0caa](https://github.com/fasenderos/hft-limit-order-book/commit/96f0caa022aa1e26f5758c967e5e2aeae08dcd27))
* update donations section on readme ([5e5387c](https://github.com/fasenderos/hft-limit-order-book/commit/5e5387cf32c01d36575a9b4ea57a335c62b8acbb))


### Test

* lcov report for tap v18 ([da03e9a](https://github.com/fasenderos/hft-limit-order-book/commit/da03e9a4fc04c6e8f301b055a3a15220391b7b56))
* update tap to v18.6.1 ([da31da4](https://github.com/fasenderos/hft-limit-order-book/commit/da31da41a28b139fc589df9d823ddcf16230b5d2))

## [2.3.5](https://github.com/fasenderos/hft-limit-order-book/compare/v2.3.4...v2.3.5) (2023-08-22)


### Chore

* disable npm publish by release-it ([739e88a](https://github.com/fasenderos/hft-limit-order-book/commit/739e88a782a3017b18cdad3092ca943bb9e2a03c))

## [2.3.4](https://github.com/fasenderos/hft-limit-order-book/compare/v2.3.3...v2.3.4) (2023-08-22)


### Chore

* **deps:** replace standard-version with release-it ([6368cab](https://github.com/fasenderos/hft-limit-order-book/commit/6368cab5d35de229e7b322220370eeb9dc62ab89))
* optional size or price on order update ([148f050](https://github.com/fasenderos/hft-limit-order-book/commit/148f050f8cd77a37033b7e7746d3a5c72b2aee2a))


### Documentation

* recreate changelog with release-it conventionalcommits ([5068e84](https://github.com/fasenderos/hft-limit-order-book/commit/5068e84558820547dbd95b1a37ff52d4fd45def8))


### Test

* minimum coverage 95 ([7ac655d](https://github.com/fasenderos/hft-limit-order-book/commit/7ac655d349f196d1379b1a7a51e5cf4d7ed0a02f))

## [2.3.3](https://github.com/fasenderos/hft-limit-order-book/compare/v2.3.2...v2.3.3) (2023-08-19)


### Performance Improvements

* improve order types and comment ([cd8e97a](https://github.com/fasenderos/hft-limit-order-book/commit/cd8e97a4bd91ba83993372f36006d6fb41e21b4c))

## [2.3.2](https://github.com/fasenderos/hft-limit-order-book/compare/v2.3.1...v2.3.2) (2023-07-16)


### Features

* use bignumber.js for size precision ([4449d68](https://github.com/fasenderos/hft-limit-order-book/commit/4449d68ec8e854272da694a9f325cb8ab481b961))

## [2.3.1](https://github.com/fasenderos/hft-limit-order-book/compare/v2.3.0...v2.3.1) (2023-07-16)


### Performance Improvements

* remove useless check ([ed1c887](https://github.com/fasenderos/hft-limit-order-book/commit/ed1c887a3493dc5191b41bcdb51b58df92d74a1f))

## [2.3.0](https://github.com/fasenderos/hft-limit-order-book/compare/v2.2.1...v2.3.0) (2023-05-09)


### Performance Improvements

* improve OrderSide performance by saving asks in ascending order and bids in descending order ([57b0e34](https://github.com/fasenderos/hft-limit-order-book/commit/57b0e34a392af26fb80ed56cc141652da8c8e1b5))

## [2.2.1](https://github.com/fasenderos/hft-limit-order-book/compare/v2.2.0...v2.2.1) (2023-05-08)


### Bug Fixes

* check if sell FOK order can be filled ([2814b3e](https://github.com/fasenderos/hft-limit-order-book/commit/2814b3eff4dea8fe8e4bd76107aec78f27993dad))

## [2.2.0](https://github.com/fasenderos/hft-limit-order-book/compare/v2.1.0...v2.2.0) (2023-05-06)


### Features

* add isMaker flag on response [#172](https://github.com/fasenderos/hft-limit-order-book/issues/172) ([82d811b](https://github.com/fasenderos/hft-limit-order-book/commit/82d811b45ce426c8179a3ca8fbf8f49205c6b0a2))

## [2.1.0](https://github.com/fasenderos/hft-limit-order-book/compare/v2.0.2...v2.1.0) (2023-03-29)


### Features

* add fill or kill time in force ([a146cfe](https://github.com/fasenderos/hft-limit-order-book/commit/a146cfecee71d236111dafc792dbe0ac07fb841f))
* add immediate or cancel time in force ([aa671c6](https://github.com/fasenderos/hft-limit-order-book/commit/aa671c616d08a00f4c55a55c3f8e0fe2590281e2))

## [2.0.2](https://github.com/fasenderos/hft-limit-order-book/compare/v2.0.1...v2.0.2) (2023-03-21)


### Bug Fixes

* incorrect size amount on partial processed order ([#156](https://github.com/fasenderos/hft-limit-order-book/issues/156)) ([25cca3f](https://github.com/fasenderos/hft-limit-order-book/commit/25cca3f3222c8d76a89cb1ecb28ecf43b62f6956))


### Performance Improvements

* avoid check best price ([f109feb](https://github.com/fasenderos/hft-limit-order-book/commit/f109febdebe839a989aed59c98503dfa515382d2))
* check order side is valid ([66ad34a](https://github.com/fasenderos/hft-limit-order-book/commit/66ad34a8681ea6e0aa3ee98de77bc0e64b20a5d7))

## [2.0.1](https://github.com/fasenderos/hft-limit-order-book/compare/v2.0.0...v2.0.1) (2022-11-20)


### Bug Fixes

* remove deprecated function ([1682ff5](https://github.com/fasenderos/hft-limit-order-book/commit/1682ff52930a1019f3f3a22c9d43057770d997f4))

## [2.0.0](https://github.com/fasenderos/hft-limit-order-book/compare/v1.1.0...v2.0.0) (2022-11-20)

## [1.1.0](https://github.com/fasenderos/hft-limit-order-book/compare/v1.0.0...v1.1.0) (2022-08-16)


### Features

* add createOrder method and deprecated old function names ([8a12fc7](https://github.com/fasenderos/hft-limit-order-book/commit/8a12fc73a25290bb26128bfc43882151e8690df7))

## [1.0.0](https://github.com/fasenderos/hft-limit-order-book/compare/v0.0.6...v1.0.0) (2022-08-16)


### Features

* support price and/or size updating of an order ([a0fba73](https://github.com/fasenderos/hft-limit-order-book/commit/a0fba7342ac36d2dd03df07be5127f3fc59f9476))

## [0.0.6](https://github.com/fasenderos/hft-limit-order-book/compare/v0.0.5...v0.0.6) (2022-07-29)


### Features

* add benchmark ([6b52088](https://github.com/fasenderos/hft-limit-order-book/commit/6b52088491fdc8ee913721bddf315bfae556ec04))


### Performance Improvements

* init benchmark ([78bc7f3](https://github.com/fasenderos/hft-limit-order-book/commit/78bc7f3df00825d2b0a47106e1e50e0f816f7fa0))

## [0.0.5](https://github.com/fasenderos/hft-limit-order-book/compare/v0.0.4...v0.0.5) (2022-07-29)


### Features

* add code coverage ([7dc79ea](https://github.com/fasenderos/hft-limit-order-book/commit/7dc79ea9c320c3cd8d937db4c5de1dc544aa80c3))
* add code security scanner ([2362528](https://github.com/fasenderos/hft-limit-order-book/commit/236252859662158ca975a1824ec344315873623a))
* add codecov config ([672671d](https://github.com/fasenderos/hft-limit-order-book/commit/672671dec8385d7c60950433b2bf08cec3fc5cd1))
* add dependabot ([1e46e08](https://github.com/fasenderos/hft-limit-order-book/commit/1e46e089735442bb50bb7a695074ebf70ffef768))
* add dependebot auto-merge action ([4937a06](https://github.com/fasenderos/hft-limit-order-book/commit/4937a06ceafccfccaa5746b2cbbb98a438bddd77))


### Bug Fixes

* circle ci coverage upload ([1114be2](https://github.com/fasenderos/hft-limit-order-book/commit/1114be236e047645f3f9d8533ae58031852a9794))

## [0.0.4](https://github.com/fasenderos/hft-limit-order-book/compare/v0.0.3...v0.0.4) (2022-07-28)


### Bug Fixes

* fix update order and limit order when order already exist ([a9313cf](https://github.com/fasenderos/hft-limit-order-book/commit/a9313cf65d6dc4da963fe22f3a5db615b957d2ff))

## [0.0.3](https://github.com/fasenderos/hft-limit-order-book/compare/v0.0.2...v0.0.3) (2022-07-28)


### Performance Improvements

* replace dbly-linked-list with denque ([f0c9b92](https://github.com/fasenderos/hft-limit-order-book/commit/f0c9b92893f23497a4a3e338a9fe06a9e76aa117))

## [0.0.2](https://github.com/fasenderos/hft-limit-order-book/compare/v0.0.1...v0.0.2) (2022-07-26)


### Bug Fixes

* add missing addscope script ([4c5098c](https://github.com/fasenderos/hft-limit-order-book/commit/4c5098c86150b29ba28c6e59aac29af987791101))

## [0.0.1](https://github.com/fasenderos/hft-limit-order-book/compare/1136a0e14392709161ff82a8937ce601e1277d03...v0.0.1) (2022-07-26)


### Features

* initial release ([1136a0e](https://github.com/fasenderos/hft-limit-order-book/commit/1136a0e14392709161ff82a8937ce601e1277d03))
