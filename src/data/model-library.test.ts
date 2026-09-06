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
