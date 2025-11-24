async function main() {
  const response = await fetch('http://localhost:3000/x/proxy', {
    method: 'HEAD',
  })
  console.log(await response.text())
  console.log(response.headers.get('x-buffetd'))
}

main()
