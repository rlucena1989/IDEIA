module AppHandler
    ( handleCreate
    , handleList
    ) where

import qualified App
import Servant
import Data.UUID (UUID)

type AppAPI = "api" :> "Apps" :> Get '[JSON] [App.App]
            :<|> "api" :> "Apps" :> ReqBody '[JSON] Text :> Post '[JSON] App.App

handleCreate :: Text -> Handler App.App
handleCreate name' = liftIO $ App.createApp name'

handleList :: Handler [App.App]
handleList = return []
