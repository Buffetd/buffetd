'use client'
import React, { useEffect, useState } from 'react'

import type { PaginatedDocs } from 'payload'
import type { Source, Entry } from '@/payload-types'

export default function PageClient({ sources }: { sources: PaginatedDocs<Source> }) {
  const [proxyUrl, setProxyUrl] = useState('https://v1.hitokoto.cn/?c=b')
  const [proxyResult, setProxyResult] = useState<any>(null)

  const proxyDirectly = (url: string) => {
    // TODO: implement proxy logic
    console.log('Proxying URL:', url)
    fetch(`x/proxy?url=${encodeURIComponent(url)}`)
      .then((response) => response.json())
      .then((data) => {
        console.log('Proxy response:', data)
        setProxyResult(data)
        // TODO: handle the response data to extract entries
      })
      .catch((error) => {
        console.error('Proxy error:', error)
        setProxyResult(null)
      })
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Try Buffetd</h1>
          <p className="mt-2 text-base-content/70">Proxy an endpoint or pick a predefined source to grab entries.</p>
        </div>

        <div role="tablist" className="tabs tabs-lifted">
          <input type="radio" name="try_buffetd" role="tab" className="tab" aria-label="Proxy" defaultChecked />
          <div role="tabpanel" className="tab-content rounded-box border border-base-300 bg-base-100 p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card bg-base-100">
                <div className="card-body">
                  <h2 className="card-title">Direct proxy</h2>
                  <p className="text-sm text-base-content/70">
                    Enter a URL and preview the JSON response returned through Buffetd.
                  </p>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Endpoint URL</span>
                    </label>

                    <div className="join w-full">
                      <input
                        type="url"
                        className="input input-bordered join-item w-full"
                        placeholder="https://api.example.com/data"
                        value={proxyUrl}
                        onChange={(e) => setProxyUrl(e.target.value)}
                      />
                      <button className="btn btn-primary join-item" onClick={() => proxyDirectly(proxyUrl)}>
                        Proxy & Grab
                      </button>
                    </div>

                    <label className="label">
                      <span className="label-text-alt text-base-content/60">Example: https://v1.hitokoto.cn/?c=b</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="card border border-base-200 bg-base-100 shadow-sm">
                <div className="card-body">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">Response preview</h3>
                    {proxyResult ? (
                      <div className="badge badge-success badge-outline">OK</div>
                    ) : (
                      <div className="badge badge-ghost">No data</div>
                    )}
                  </div>

                  {proxyResult ? (
                    <div className="mockup-code max-h-96 overflow-auto">
                      <pre>
                        <code>{JSON.stringify(proxyResult, null, 2)}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-6 text-sm text-base-content/70">
                      Run a request to see the JSON response here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <input type="radio" name="try_buffetd" role="tab" className="tab" aria-label="Grab" />
          <div role="tabpanel" className="tab-content rounded-box border border-base-300 bg-base-100 p-6">
            <div className="card bg-base-100">
              <div className="card-body">
                <h2 className="card-title">Predefined sources</h2>
                <p className="text-sm text-base-content/70">
                  Choose one of your configured sources to grab entries (coming soon).
                </p>

                <div className="form-control max-w-2xl">
                  <label className="label">
                    <span className="label-text">Source</span>
                  </label>
                  <div className="join w-full">
                    <select className="select select-bordered join-item w-full" name="source" id="source">
                      <option value="">Select a source</option>
                      {sources.docs.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-primary join-item" disabled>
                      Grab Entries
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
