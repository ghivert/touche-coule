import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './styles.module.css'
import * as ethereum from '@/lib/ethereum'
import * as main from '@/lib/main'
import { BigNumber } from 'ethers'

type Canceler = () => void
const useAffect = (
  asyncEffect: () => Promise<Canceler | void>,
  dependencies: any[] = []
) => {
  const cancelerRef = useRef<Canceler | void>()
  useEffect(() => {
    asyncEffect()
      .then(canceler => (cancelerRef.current = canceler))
      .catch(error => console.warn('Uncatched error', error))
    return () => {
      if (cancelerRef.current) {
        cancelerRef.current()
        cancelerRef.current = undefined
      }
    }
  }, dependencies)
}

const useWindowSize = () => {
  const [size, setSize] = useState({ height: 0, width: 0 })
  const compute = useCallback(() => {
    const height = Math.min(window.innerHeight, 800)
    const width = Math.min(window.innerWidth, 800)
    if (height < width) setSize({ height, width: height })
    else setSize({ height: width, width })
  }, [])
  useEffect(() => {
    compute()
    window.addEventListener('resize', compute)
    return () => window.addEventListener('resize', compute)
  }, [compute])
  return size
}

const useWallet = () => {
  const [details, setDetails] = useState<ethereum.Details>()
  const [contract, setContract] = useState<main.Main>()
  useAffect(async () => {
    const details_ = await ethereum.connect('metamask')
    if (!details_) return
    setDetails(details_)
    const contract_ = await main.init(details_)
    if (!contract_) return
    setContract(contract_)
  }, [])
  return useMemo(() => {
    if (!details || !contract) return
    return { details, contract }
  }, [details, contract])
}

const useWallet2 = () => {
  const [details, setDetails] = useState<ethereum.Details>()
  const [contract, setContract] = useState<main.ShipFactory>()
  useAffect(async () => {
    const details_ = await ethereum.connect('metamask')
    if (!details_) return
    setDetails(details_)
    const contract_ = await main.initFactory(details_)
    if (!contract_) return
    setContract(contract_)
  }, [])
  return useMemo(() => {
    if (!details || !contract) return
    return { details, contract }
  }, [details, contract])
}

type Ship = {}
type ShipCELL = {owner : string}
const useBoard = (wallet: ReturnType<typeof useWallet>, wallet2: ReturnType<typeof useWallet2>) => {
  const [board, setBoard] = useState<(null | Ship)[][]>([])
  useAffect(async () => {
    if (!wallet) return
    if(!wallet2) return 
    const onRegistered = (
      id: BigNumber,
      owner: string,
      x: BigNumber,
      y: BigNumber
    ) => {
      console.log('onRegistered')
      setBoard(board => {
        return board.map((x_, index) => {
          if (index !== x.toNumber()) return x_
          return x_.map((y_, indey) => {
            if (indey !== y.toNumber()) return y_
            return { owner, index: id.toNumber() }
          })
        })
      })
    }
    const onTouched = (id: BigNumber, x_: BigNumber, y_: BigNumber) => {
      console.log('onTouched')
      const x = x_.toNumber()
      const y = y_.toNumber()
      setBoard(board => {
        return board.map((x_, index) => {
          if (index !== x) return x_
          return x_.map((y_, indey) => {
            if (indey !== y) return y_
            return null
          })
        })
      })
    }
    const onMove = (id: BigNumber,owner: string, exX: BigNumber, exY: BigNumber, x: BigNumber, y: BigNumber) => {
      console.log('onMove')
      const xt = exX.toNumber();
      const yt = exY.toNumber();
      setBoard(board => {
        return board.map((x_, index) => {
          if (index !== xt) return x_
          return x_.map((y_, indey) => {
            if (indey !== yt) return y_
            return null
          })
        })
      })
      setBoard(board => {
        return board.map((x_, index) => {
          if (index !== x.toNumber()) return x_
          return x_.map((y_, indey) => {
            if (indey !== y.toNumber()) return y_
            return { owner, index: id.toNumber() }
          })
        })
      })
    }


    const updateSize = async () => {
      const [event] = await wallet.contract.queryFilter('Size', 0)
      const width = event.args.width.toNumber()
      const height = event.args.height.toNumber()
      const content = new Array(width).fill(0)
      const final = content.map(() => new Array(height).fill(null))
      setBoard(final)
    }
    const updateRegistered = async () => {
      const registeredEvent = await wallet.contract.queryFilter('Registered', 0)
      registeredEvent.forEach(event => {
        const { index, owner, x, y } = event.args
          onRegistered(index, owner, x, y)
      })
    }
    const updateTouched = async () => {
      const touchedEvent = await wallet.contract.queryFilter('Touched', 0)
      touchedEvent.forEach(event => {
        const { ship, x, y } = event.args
        onTouched(ship, x, y)
      })
    }

    const updateMove = async () => {
      const registeredEvent = await wallet.contract.queryFilter('Move', 0)
      registeredEvent.forEach(event => {
        const { index, owner,exX, exY,  x, y } = event.args
        onMove(index, owner,exX, exY, x, y)
        
      })
    const onShipDeploy = (a: string) => {
      console.log('onShipDeploy')
      wallet.contract.register(a)
        .catch(err => {
          console.log(err.reason.split("'")[1])
        })
    }
    await updateSize()
    await updateRegistered()
    await updateTouched()
    await updateMove()
    console.log('Registering')
    wallet.contract.on('Registered', onRegistered)
    wallet.contract.on('Touched', onTouched)

    wallet.contract.on('Move',onMove)
    wallet2?.contract.on('ShipDeploy', onShipDeploy)
    return () => {
      console.log('Unregistering')
      wallet.contract.off('Registered', onRegistered)
      wallet.contract.off('Touched', onTouched)
      wallet.contract.off('Move',onMove)
      wallet2?.contract.off('ShipDeploy', onShipDeploy)
    }
  }, [wallet, wallet2])
  return board
}



const Buttons = ({ wallet, wallet2 }: { wallet: ReturnType<typeof useWallet> , wallet2 : ReturnType<typeof useWallet2>}) => {
  const next = () => wallet?.contract.turn().then(r => console.log("turn over"))
  const register = async () => {
    wallet2?.contract.getListTypeShip().then(res => console.log(res))
    wallet2?.contract.deployShip(0).then(res => console.log("deploy done"))
  }
  return (
    <div style={{ display: 'flex', gap: 5, padding: 5 }}>
      <button onClick={
        register
      }>Register</button>
      <button onClick={next}>Turn</button>
    </div>
  )
}

const CELLS = new Array(100 * 100)

type Color = string
type ColorOwner = { owner: string, color: Color }
let colorOwner: ColorOwner[] = []

const getColorOwner = (owner: string): Color => {
  let color = colorOwner?.find(co => co?.owner == owner)
  if (color) return color.color
  let newColor: string | undefined = '#' + (Math.random() * 0xFFFFFF << 0).toString(16)
  colorOwner.push({ owner: owner, color: newColor })
  return newColor
}

export const App = () => {
  const wallet = useWallet()
  const wallet2 = useWallet2()
  const board = useBoard(wallet, wallet2)
  const size = useWindowSize()
  const st = {
    ...size,
    gridTemplateRows: `repeat(${board?.length ?? 0}, 1fr)`,
    gridTemplateColumns: `repeat(${board?.[0]?.length ?? 0}, 1fr)`,
  }
  return (
    <div className={styles.body}>
      <h1>Welcome to Touché Coulé</h1>
      <div className={styles.grid} style={st}>
        {CELLS.fill(0).map((_, index) => {
          const x = Math.floor(index % board?.length ?? 0)
          const y = Math.floor(index / board?.[0]?.length ?? 0)
          let shipOwner : string = board?.[x]?.[y]  ? (board?.[x]?.[y] as ShipCELL).owner : ""
          const color = (shipOwner == wallet?.details.account) ? "green" : "red"
          const background = board?.[x]?.[y] ? color : undefined
          return (
            <div key={index} className={styles.cell} style={{ background }} />
          )
        })}
      </div>
      <Buttons wallet={wallet} wallet2={wallet2}/>
    </div>
  )
}
