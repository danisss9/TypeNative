try { throw new Error('boom'); } catch (e) { assert((e as Error).message === 'boom', 'message'); }
