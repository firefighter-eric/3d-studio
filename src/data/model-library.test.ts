import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { assets } from './catalog'
import { DEFAULT_MODEL_FILTERS, filterModels, libraryModels, MODEL_BRANDS, MODEL_TYPES, MODEL_SOURCES, modelLibraryHash, readModelFilters } from './model-library'

test('the unified library includes each registered model once with a valid classification and local assets', () => {
  assert.deepEqual(new Set(libraryModels.map(model => model.id)), new Set(assets.map(model => model.id)))
  assert.equal(libraryModels.length, assets.length)
  for (const model of libraryModels) {
    assert.ok(Object.hasOwn(MODEL_BRANDS, model.brand), model.id)
    assert.ok(Object.hasOwn(MODEL_TYPES, model.type), model.id)
    assert.ok(Object.hasOwn(MODEL_SOURCES, model.source), model.id)
    for (const file of [model.preview, model.download].filter(Boolean)) assert.ok(existsSync(`public${file}`), `${model.id}: ${file}`)
  }
})

test('Chinese, English, spelling variants and model aliases search across collections', () => {
  const search = (query: string) => filterModels({ ...DEFAULT_MODEL_FILTERS, query })
  assert.ok(search('苹果').length > 0)
  assert.ok(search('苹果').every(model => model.brand === 'apple'))
  assert.deepEqual(search('STARSHIP').map(model => model.id), ['starship'])
  assert.deepEqual(new Set(search('nv72').map(model => model.id)), new Set(['nvidia-gb200-nvl72', 'nvidia-gb300-nvl72']))
  assert.deepEqual(search('NV Studio').map(model => model.id), ['nvidia-dgx-station'])
  assert.deepEqual(search('猎鹰 9').map(model => model.id), ['falcon-9'])
  for (const query of ['重型猎鹰', '猎鹰重型', 'Falcon Heavy', '双助推器']) assert.deepEqual(search(query).map(model => model.id), ['falcon-heavy'])
  assert.deepEqual(search('ＧＢ３００　ＮＶＬ７２').map(model => model.id), ['nvidia-gb300-nvl72'])
})

test('model types are independent of brand and combine with search and provenance', () => {
  const computers = filterModels({ ...DEFAULT_MODEL_FILTERS, type: 'computer' })
  assert.ok(computers.some(model => model.id === 'apple-macbook-pro'))
  assert.ok(computers.some(model => model.id === 'nvidia-dgx-spark'))
  assert.ok(filterModels({ ...DEFAULT_MODEL_FILTERS, query: '电脑' }).some(model => model.id === 'nvidia-dgx-spark'))
  const drones = filterModels({ ...DEFAULT_MODEL_FILTERS, query: '大疆 无人机' })
  assert.ok(drones.length > 0)
  assert.ok(drones.every(model => model.brand === 'dji' && model.type === 'drone'))
  assert.deepEqual(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'dji', type: 'drone', source: 'official' }).map(model => model.id), ['dji-inspire-3'])
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'apple', type: 'drone' }).length, 0)
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, query: 'this-model-does-not-exist' }).length, 0)
})

test('Tesla products join shared search, cross-brand car filters and new robot/energy/charger types', () => {
  const search = (query: string) => filterModels({ ...DEFAULT_MODEL_FILTERS, query })
  for (const query of ['Tesla', '特斯拉']) {
    assert.equal(search(query).length, 12)
    assert.ok(search(query).every(model => model.brand === 'tesla'))
  }
  for (const [query, id] of [['Model 3', 'tesla-model-3'], ['赛博皮卡', 'tesla-cybertruck'], ['擎天柱', 'tesla-optimus'], ['Robotaxi', 'tesla-cybercab'], ['超充', 'tesla-supercharger-v4']]) {
    assert.deepEqual(search(query).map(model => model.id), [id])
  }
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'tesla', type: 'car' }).length, 8)
  assert.ok(filterModels({ ...DEFAULT_MODEL_FILTERS, type: 'car' }).some(model => model.id === 'formula-r1'))
  assert.ok(search('F1').every(model => model.brand === 'original'))
  for (const [type, count] of [['robot', 1], ['energy', 2], ['charger', 1]] as const) assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'tesla', type, source: 'reconstructed' }).length, count)
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'tesla', source: 'official' }).length, 0)
  const filters = { ...DEFAULT_MODEL_FILTERS, brand: 'tesla', type: 'energy', query: '储能', sort: 'name' } as const
  assert.deepEqual(readModelFilters(modelLibraryHash(filters)), filters)
})

test('GeForce model aliases combine with NVIDIA, GPU and provenance filters', () => {
  const search = (query: string) => filterModels({ ...DEFAULT_MODEL_FILTERS, query })
  for (const [query, id] of [['1080Ti', 'nvidia-gtx-1080-ti'], ['GTX 1080 Ti', 'nvidia-gtx-1080-ti'], ['２０８０Ｔｉ', 'nvidia-rtx-2080-ti'], ['3090', 'nvidia-rtx-3090'], ['RTX 4090', 'nvidia-rtx-4090'], ['英伟达 5090', 'nvidia-rtx-5090']]) {
    assert.deepEqual(search(query).map(model => model.id), [id])
  }
  assert.equal(search('GeForce').length, 5)
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'nvidia' }).length, 11)
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'nvidia', type: 'gpu', source: 'reconstructed' }).length, 6)
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'nvidia', source: 'official' }).length, 0)
  assert.deepEqual(search('SXM').map(model => model.id), ['nvidia-b300-sxm'])
})

test('Xbox and PS5 search by brand, console type and precise model variants', () => {
  const search = (query: string) => filterModels({ ...DEFAULT_MODEL_FILTERS, query })
  for (const query of ['Xbox', '微软', 'Microsoft']) assert.equal(search(query).length, 2)
  for (const query of ['PS5', 'ＰＳ５', 'PlayStation 5', '索尼', 'Sony']) assert.equal(search(query).length, 2)
  for (const [query, id] of [['Xbox Series X', 'microsoft-xbox-series-x'], ['Xbox Series S', 'microsoft-xbox-series-s'], ['Series X', 'microsoft-xbox-series-x'], ['XSS', 'microsoft-xbox-series-s'], ['PS5 Slim', 'sony-ps5-slim'], ['PS5 Pro', 'sony-ps5-pro']]) assert.deepEqual(search(query).map(model => model.id), [id])
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, type: 'console' }).length, 4)
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'sony', type: 'console', query: '光驱' }).length, 1)
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, brand: 'microsoft', type: 'console' }).length, 2)
  assert.equal(filterModels({ ...DEFAULT_MODEL_FILTERS, type: 'console', source: 'official' }).length, 0)
  const filters = { ...DEFAULT_MODEL_FILTERS, brand: 'microsoft', type: 'console', query: 'Xbox Series X' } as const
  assert.deepEqual(readModelFilters(modelLibraryHash(filters)), filters)
  // Preserve other single-letter product names when tightening Xbox variants.
  assert.deepEqual(search('Model S').map(model => model.id), ['tesla-model-s'])
  assert.deepEqual(search('Model X').map(model => model.id), ['tesla-model-x'])
})

test('sorting retains all matches and does not mutate the default library order', () => {
  const before = libraryModels.map(model => model.id)
  const sorted = filterModels({ ...DEFAULT_MODEL_FILTERS, sort: 'name' })
  assert.equal(sorted.length, before.length)
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })
  for (let i = 1; i < sorted.length; i++) assert.ok(collator.compare(sorted[i - 1].name, sorted[i].name) <= 0)
  assert.deepEqual(libraryModels.map(model => model.id), before)
})

test('library URLs round-trip combined filters and reject invalid parameters', () => {
  const state = { ...DEFAULT_MODEL_FILTERS, query: '大疆 & camera / 4?', brand: 'dji', type: 'camera', source: 'reconstructed', sort: 'name' } as const
  assert.deepEqual(readModelFilters(modelLibraryHash(state)), state)
  assert.equal(modelLibraryHash(DEFAULT_MODEL_FILTERS), '#models')
  assert.deepEqual(readModelFilters('#models?brand=__proto__&type=nope&sort=missing&source=unknown'), DEFAULT_MODEL_FILTERS)
  assert.deepEqual(readModelFilters('#models/starship'), DEFAULT_MODEL_FILTERS)
})
