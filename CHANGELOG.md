# Changelog

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