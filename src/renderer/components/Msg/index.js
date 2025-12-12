const queue = []
const maxLength = 5

export default {
  install: function (Vue, Message, defaultOption = {}) {
    Vue.prototype.$msg = new Proxy(Message, {
      get (obj, prop) {
        return (arg) => {
          if (!(arg instanceof Object)) {
            arg = { message: arg }
          }
          const task = {
            run () {
              let clickTarget = null
              let clickHandler = null
              let clicked = false
              const vm = obj[prop]({
                ...defaultOption,
                ...arg,
                onClose (...data) {
                  if (clickTarget && clickHandler) {
                    try {
                      clickTarget.removeEventListener('click', clickHandler)
                    } catch (e) {}
                  }
                  const currentTask = queue.pop()
                  if (currentTask) {
                    currentTask.run()
                  }
                  if (arg.onClose) {
                    arg.onClose(...data)
                  }
                }
              })
              if (arg.onClick && vm && vm.$el) {
                try {
                  const contentEl = vm.$el.querySelector('.el-message__content')
                  clickTarget = contentEl || vm.$el
                  clickTarget.style.cursor = 'pointer'
                  clickHandler = (e) => {
                    if (clicked) return
                    const t = e.target
                    const isClose = t && typeof t.closest === 'function' && t.closest('.el-message__closeBtn')
                    if (isClose) {
                      return
                    }
                    clicked = true
                    try {
                      arg.onClick(e)
                    } finally {
                      if (vm && typeof vm.close === 'function') {
                        vm.close()
                      }
                    }
                  }
                  clickTarget.addEventListener('click', clickHandler)
                } catch (e) {}
              }
            }
          }

          if (queue.length >= maxLength) {
            queue.pop()
          }
          queue.unshift(task)

          if (queue.length === 1) {
            queue.pop().run()
          }
        }
      }
    })
  }
}
