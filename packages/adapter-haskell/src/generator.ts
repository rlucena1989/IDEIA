import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile { path: string; content: string }

export function generateModule(moduleName: string, destDir: string): GeneratedFile[] {
  const cap = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  return [
    {
      path: path.join(destDir, `${cap}.hs`),
      content: `module ${cap}
    ( ${cap}(..)
    , create${cap}
    , get${cap}
    , list${cap}s
    ) where

import Data.Aeson (ToJSON, FromJSON, toJSON, parseJSON)
import Data.Text (Text)
import GHC.Generics (Generic)
import Data.Time (UTCTime, getCurrentTime)
import Data.UUID (UUID, nil)
import Data.UUID.V4 (nextRandom)

data ${cap} = ${cap}
    { id :: !UUID
    , name :: !Text
    , createdAt :: !UTCTime
    } deriving (Show, Generic)

instance ToJSON ${cap}
instance FromJSON ${cap}

create${cap} :: Text -> IO ${cap}
create${cap} name' = do
    uuid <- nextRandom
    time <- getCurrentTime
    return ${cap} { id = uuid, name = name', createdAt = time }

get${cap} :: UUID -> [${cap}] -> Maybe ${cap}
get${cap} uuid = find (\\x -> id x == uuid)

list${cap}s :: [${cap}] -> [${cap}]
list${cap}s = id
`,
    },
    {
      path: path.join(destDir, `${cap}Handler.hs`),
      content: `module ${cap}Handler
    ( handleCreate
    , handleList
    ) where

import qualified ${cap}
import Servant
import Data.UUID (UUID)

type ${cap}API = "api" :> "${moduleName}s" :> Get '[JSON] [${cap}.${cap}]
            :<|> "api" :> "${moduleName}s" :> ReqBody '[JSON] Text :> Post '[JSON] ${cap}.${cap}

handleCreate :: Text -> Handler ${cap}.${cap}
handleCreate name' = liftIO $ ${cap}.create${cap} name'

handleList :: Handler [${cap}.${cap}]
handleList = return []
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const simpleName = path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
  const cap = simpleName.charAt(0).toUpperCase() + simpleName.slice(1);
  return [
    {
      path: path.join(projectName, `${simpleName}.cabal`),
      content: `cabal-version: 3.4
name: ${simpleName}
version: 0.1.0
build-type: Simple

library
  exposed-modules: ${cap}
  build-depends: base >=4.18,
                 aeson,
                 text,
                 uuid,
                 time,
                 servant,
                 servant-server,
                 warp
  hs-source-dirs: src
  default-language: GHC2021

executable ${simpleName}-exe
  main-is: Main.hs
  build-depends: base, ${simpleName}, warp, servant-server
  hs-source-dirs: app
  default-language: GHC2021
`,
    },
    {
      path: path.join(projectName, 'app', 'Main.hs'),
      content: `module Main where

import Servant (serve)
import Network.Wai.Handler.Warp (run)
import ${cap} (${cap}API, handleCreate, handleList)

api :: Proxy ${cap}API
api = Proxy

server :: Server ${cap}API
server = handleList :<|> handleCreate

main :: IO ()
main = run 8080 $ serve api server
`,
    },
    {
      path: path.join(projectName, 'stack.yaml'),
      content: `resolver: lts-22.0
packages:
- .
`,
    },
  ];
}

export function writeFiles(files: GeneratedFile[]): void {
  for (const f of files) {
    const dir = path.dirname(f.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f.path, f.content, 'utf-8');
  }
}
