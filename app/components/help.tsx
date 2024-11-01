"use client"

import { useEffect } from "react";

const Help = () => {

    useEffect(() => {
        document.getElementById("my_modal_3").showModal();
    }, [])

    return(
        <>
      <dialog id="my_modal_3" className="modal">
        <div className="modal-box">
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>
          <h3 className="font-medium text-lg">How to use</h3>
          <p className="py-4">Groupify is a simple tool designed to make the creation of groups easier and faster</p>
        </div>
      </dialog>
      </>
    )
}

export default Help;