import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import fetch from 'node-fetch'
import { pinata } from 'frog/hubs'

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$GOLDIES Token Tracker on Polygon',
  hub: pinata(),
})

const GOLDIES_TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e'
const POLYGON_CHAIN_ID = 137
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'; // Replace with your actual Airstack API key

async function getGoldiesBalance(address: string): Promise<string> {
  console.log('Fetching balance for address:', address)
  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({
        query: `
          query GetGoldiesBalance($ownerAddress: Identity!) {
            TokenBalances(
              input: {
                filter: {
                  tokenAddress: {_eq: "${GOLDIES_TOKEN_ADDRESS}"},
                  owner: {_eq: $ownerAddress}
                },
                blockchain: polygon
              }
            ) {
              TokenBalance {
                amount
                formattedAmount
              }
            }
          }
        `,
        variables: {
          ownerAddress: address
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airstack API response for balance:', JSON.stringify(data, null, 2));

    if (data.data?.TokenBalances?.TokenBalance && data.data.TokenBalances.TokenBalance.length > 0) {
      const balance = data.data.TokenBalances.TokenBalance[0].formattedAmount;
      console.log('Fetched $GOLDIES balance:', balance);
      return balance;
    } else {
      console.log('No $GOLDIES balance found for the address');
      return "0";
    }
  } catch (error) {
    console.error('Error in getGoldiesBalance:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return 'Error: Unable to fetch balance';
  }
}

async function getGoldiesUsdPrice(): Promise<number> {
  try {
    console.log('Fetching $GOLDIES price from DEX Screener...')
    const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/polygon/0x19976577bb2fa3174b4ae4cf55e6795dde730135')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json()
    console.log('DEX Screener API response:', JSON.stringify(data, null, 2))

    if (data.pair && data.pair.priceUsd) {
      const priceUsd = parseFloat(data.pair.priceUsd)
      console.log('Fetched $GOLDIES price in USD:', priceUsd)
      return priceUsd
    } else {
      console.error('Invalid or missing price data in DEX Screener response:', data)
      throw new Error('Invalid price data received from DEX Screener')
    }
  } catch (error) {
    console.error('Error in getGoldiesUsdPrice:', error)
    throw error
  }
}

async function getConnectedAddress(fid: number): Promise<string | null> {
  console.log(`Attempting to fetch connected address for FID: ${fid}`);
  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({
        query: `
          query ConnectWalletWithFID($fid: String!) {
            Socials(
              input: {filter: {userId: {_eq: $fid}, dappName: {_eq: farcaster}}, blockchain: ethereum}
            ) {
              Social {
                userAssociatedAddresses
              }
            }
          }
        `,
        variables: {
          fid: fid.toString()
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Airstack API full response for connected address:', JSON.stringify(data, null, 2));
    
    if (data.data?.Socials?.Social && data.data.Socials.Social.length > 0) {
      const addresses = data.data.Socials.Social[0].userAssociatedAddresses;
      console.log('User associated addresses:', addresses);
      
      if (addresses && addresses.length > 0) {
        // Prioritize Polygon addresses if available
        const polygonAddress = addresses.find((addr: string) => addr.startsWith('0x'));
        if (polygonAddress) {
          console.log(`Found address for FID ${fid}:`, polygonAddress);
          return polygonAddress;
        }
      }
    }
    
    console.error('No connected address found for the user');
    return null;
  } catch (error) {
    console.error('Detailed error in getConnectedAddress:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%', 
        backgroundImage: 'url(https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVfEoPSGHFGByQoGxUUwPq2qzE4uKXT7CSKVaigPANmjZ)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px', 
        boxSizing: 'border-box' 
      }}>
        <h1 style={{ 
          fontSize: '60px', 
          marginBottom: '20px', 
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>$GOLDIES Balance Checker</h1>
        <p style={{ 
          fontSize: '36px', 
          marginBottom: '20px', 
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>Click to check your $GOLDIES balance</p>
      </div>
    ),
    intents: [
      <Button action="/check">Check Balance</Button>,
    ]
  })
})

app.frame('/check', async (c) => {
  const { fid } = c.frameData || {}

  console.log('Full frameData:', JSON.stringify(c.frameData, null, 2));
  console.log('FID:', fid);

  if (!fid) {
    console.error('No FID found in frameData');
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error</h1>
          <p style={{ fontSize: '36px', textAlign: 'center' }}>Unable to retrieve your Farcaster ID. Please ensure you have a valid Farcaster profile.</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    })
  }

  try {
    console.log('Attempting to get connected address...');
    const connectedAddress = await getConnectedAddress(fid);
    if (!connectedAddress) {
      console.error('Failed to fetch connected address for FID:', fid);
      throw new Error('No connected Ethereum or Polygon address found for your Farcaster account');
    }
    console.log('Connected address:', connectedAddress);

    console.log('Fetching balance and price for address:', connectedAddress)
    const balance = await getGoldiesBalance(connectedAddress)
    let priceUsd: number | null = null
    let priceError: string | null = null

    try {
      priceUsd = await getGoldiesUsdPrice()
    } catch (error) {
      console.error('Failed to fetch $GOLDIES price:', error)
      priceError = error instanceof Error ? error.message : 'Unknown error fetching price'
    }

    let balanceDisplay = ''
    let usdValueDisplay = ''

    if (balance === '0') {
      balanceDisplay = "You don't have any $GOLDIES tokens on Polygon yet!"
    } else if (!balance.startsWith('Error')) {
      const balanceNumber = parseFloat(balance)
      balanceDisplay = `${balanceNumber.toLocaleString()} $GOLDIES on Polygon`

      if (priceUsd !== null) {
        const usdValue = balanceNumber * priceUsd
        console.log('Calculated USD value:', usdValue)
        usdValueDisplay = `(~$${usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`
      } else {
        usdValueDisplay = priceError ? `(Error fetching USD value: ${priceError})` : "(USD value calculation error)"
      }
    } else {
      balanceDisplay = balance
      usdValueDisplay = "Unable to calculate USD value"
    }

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>Your $GOLDIES Balance</h1>
          <p style={{ fontSize: '32px', textAlign: 'center' }}>FID: {fid}</p>
          <p style={{ fontSize: '42px', textAlign: 'center' }}>{balanceDisplay}</p>
          <p style={{ fontSize: '42px', textAlign: 'center' }}>{usdValueDisplay}</p>
          <p style={{ fontSize: '32px', marginTop: '20px', textAlign: 'center' }}>Address: {connectedAddress}</p>
          <p style={{ fontSize: '32px', marginTop: '10px', textAlign: 'center' }}>Network: Polygon (Chain ID: {POLYGON_CHAIN_ID})</p>
          {priceUsd !== null && <p style={{ fontSize: '26px', marginTop: '10px', textAlign: 'center' }}>Price: ${priceUsd.toFixed(8)} USD</p>}
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button.Link href="https://polygonscan.com/token/0x3150e01c36ad3af80ba16c1836efcd967e96776e">Polygonscan</Button.Link>,
        <Button action="/check">Refresh</Button>,
      ]
    })
  } catch (error) {
    console.error('Detailed error in balance check:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error</h1>
          <p style={{ fontSize: '36px', textAlign: 'center' }}>Unable to fetch balance or price.</p>
          <p style={{ fontSize: '24px', textAlign: 'center' }}>Error details: {errorMessage}</p>
          <p style={{ fontSize: '18px', textAlign: 'center', marginTop: '20px' }}>Please ensure you have a connected Ethereum or Polygon address linked to your Farcaster account.</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Retry</Button>
      ]
    })
  }
})

export const GET = handle(app)
export const POST = handle(app)