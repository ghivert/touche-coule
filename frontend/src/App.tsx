import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './styles.module.css'
import * as ethereum from '@/lib/ethereum'
import * as main from '@/lib/main'
import { BigNumber } from 'ethers'
import Form from 'react-bootstrap/Form';
import 'bootstrap/dist/css/bootstrap.min.css';

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

type Ship = {}
const useBoard = (wallet: ReturnType<typeof useWallet>) => {
  const [board, setBoard] = useState<(null | Ship)[][]>([])
  const [owners, setOwners] = useState<any>([])
  const [hitPosition, setHitPosition] = useState<any>([])
  const [winner, setWinner] = useState<any>(null)

  useAffect(async () => {
    if (!wallet) return
    const onRegistered = (
      id: BigNumber,
      owner: string,
      x: BigNumber,
      y: BigNumber
    ) => {
      console.log('onRegistered')
      setOwners(prev => {
        if(prev.find(p => p.owner === owner)) return prev
        return [...prev, {
        owner,
        color: generateHex()
      }]}
      )
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

    const onFiredAt = (ship: String, x_: BigNumber, y_: BigNumber) => {
      console.log('onFiredAt')
      const x = x_.toNumber()
      const y = y_.toNumber()
      setHitPosition(prev => [...prev, {
        ship,
        x,
        y
      }])
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

    const onHasWinner = (owner: any) => {
      setWinner(owner);
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
        console.log("Owner: " + owner)
      })
    }
    const updateTouched = async () => {
      const touchedEvent = await wallet.contract.queryFilter('Touched', 0)
      touchedEvent.forEach(event => {
        const { ship, x, y } = event.args
        onTouched(ship, x, y)
      })
    }
    const updateFiredAt = async () => {
      const firedAtEvent = await wallet.contract.queryFilter('FiredAt', 0)
      firedAtEvent.forEach(event => {
        const { ship, x, y } = event.args
        onFiredAt(ship,  x, y)
      })
    }

    const updateHasWinner = async () => {
      const firedAtEvent = await wallet.contract.queryFilter('HasWinner', 0)
      firedAtEvent.forEach(event => {
        const { owner } = event.args
        onHasWinner(owner)
      })
    }
    await updateSize()
    await updateRegistered()
    await updateFiredAt()
    await updateHasWinner()
    await updateTouched()
    console.log('Registering')
    wallet.contract.on('Registered', onRegistered)
    wallet.contract.on('FiredAt', onFiredAt)
    wallet.contract.on('HasWinner', onHasWinner)
    wallet.contract.on('Touched', onTouched)
    return () => {
      console.log('Unregistering')
      wallet.contract.off('Registered', onRegistered)
      wallet.contract.off('FiredAt', onFiredAt)
      wallet.contract.off('HasWinner', onHasWinner)
      wallet.contract.off('Touched', onTouched)
    }
  }, [wallet])
  return [board, owners, hitPosition, winner]
}

const generateHex = () => {
  const letters = "0123456789ABCDEF";
  
  let color = '#';

  for (var i = 0; i < 6; i++)
     color += letters[(Math.floor(Math.random() * 16))];

  return color
}

const Buttons = ({ wallet, position, setPosition }: { wallet: ReturnType<typeof useWallet>, position: any, setPosition: any }) => {
  const register3 = () => {
    wallet?.contract.register3(+position?.x, +position?.y)
    setPosition(null)
  }
  const register = () => wallet?.contract.register2()
  const next = () => wallet?.contract.turn()
  let i = 0; 
  return (
    <div style={{ display: 'flex', gap: 5, padding: 5 }}>
      <button onClick={register}>Register</button>
      <button onClick={register3}>Register with position</button>
      <button onClick={next}>Turn</button>
    </div>
  )
}

const CELLS = new Array(10 * 10)
export const App = () => {
  const wallet = useWallet()
  const [board, owners, hitPosition, winner] = useBoard(wallet)
  const size = useWindowSize()
  const [position, setPosition] = useState<any>(null)

  const st = {
    ...size,
    gridTemplateRows: `repeat(${board?.length ?? 0}, 1fr)`,
    gridTemplateColumns: `repeat(${board?.[0]?.length ?? 0}, 1fr)`,
  }
  

  return (
    <div className={styles.body}>
      {
        winner ? (
          <>
                    <h1>We have a winner</h1>
          <h1>{ winner } is the winner</h1>
          </>
        ) : 
        (
          <h1>Welcome to Touché Coulé</h1>
        )
      }
      {
        owners.map(owner => (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>{owner.owner}: {owner.color} <div style={{ backgroundColor: `${owner.color}`, width: '2rem', height: '10px' }}></div></div>
        ) )
      }
      <div className={styles.grid} style={st}>
        {CELLS.fill(0).map((_, index) => {
          const x = Math.floor(index % board?.length ?? 0)
          /**console.log("I want know x position:" + x); */
          const y = Math.floor(index / board?.[0]?.length ?? 0)
          /**console.log("I want know the y position:" + y);*/
          const currentPosition = board?.[x]?.[y]
          const background = currentPosition ? "url('https://raw.githubusercontent.com/zerodiversex/touche-coule/main/frontend/public/output-onlinepngtools.png')" : undefined
          const border =  currentPosition < 0 ? undefined : currentPosition ? `8px solid ${owners.find(o => o.owner === board?.[x]?.[y].owner)?.color}`  : undefined
          
          return (
            <div key={index} className={styles.cell} style={{ background, border }} />
          )
        })}
      </div>
      <Form.Label htmlFor="inputPassword5">Position X :</Form.Label>
      <Form.Control
        type="text"
        aria-describedby="passwordHelpBlock"
        value={position?.x}
        onChange={e => setPosition({
          ...position,
          x: e.target.value
        })}
      />
      <Form.Label htmlFor="inputPassword5">Position Y :</Form.Label>
      <Form.Control
        type="text"
        aria-describedby="passwordHelpBlock"
        value={position?.y}
        onChange={e => setPosition({
          ...position,
          y: e.target.value
        })}
      />
      {
        !winner && (<Buttons wallet={wallet} position={position} setPosition={setPosition} />)
      }

      History :
      {
        hitPosition.map(h => (
          <p>{h?.ship} hit at: ({h?.x}, {h?.y})</p>
        )) 
      }
    </div>
  )
}
