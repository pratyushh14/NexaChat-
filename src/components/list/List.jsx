import React from 'react'
import "./list.css"
import UserInfo from './userinfo/Userinfo'
import ChatList from './chatlist/ChatList'

const List = () => {
  return (
    <div className='list'>
      <UserInfo />
      <ChatList />
    </div>
  )
}

export default List
