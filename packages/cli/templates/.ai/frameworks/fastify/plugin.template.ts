import { FastifyPluginAsync } from 'fastify'

const __PLUGIN_NAME__Plugin: FastifyPluginAsync = async (fastify) => {
  fastify.get('/__ROUTE_NAME__', async () => ({ message: '__ROUTE_NAME__ ok' }))
}

export default __PLUGIN_NAME__Plugin
