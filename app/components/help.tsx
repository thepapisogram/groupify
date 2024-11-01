"use client"

import Image from "next/image";
import { useEffect } from "react";

const Help = () => {

    useEffect(() => {
      const modalElement = document.getElementById(
        "my_modal_3"
      ) as HTMLDialogElement;
      if (modalElement) {
        modalElement.showModal();
      } else {
        console.error("Modal element not found");
      }
    }, []);

    return (
      <>
        <dialog id="my_modal_3" className="modal">
          <div className="modal-box">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
            </form>
            <h3 className="font-extrabold text-lg">Welcome to Groupify!</h3>
            <h3 className="font-bold text-md">How to use</h3>
            <div className="my-5">
              <p className="font-normal">
                1. Click the &ldquo;Enter Names Here&ldquo; field.
              </p>
              <Image
                alt="how to use"
                src="https://ajeuwbhvhr.cloudimg.io/colony-recorder.s3.amazonaws.com/files/2024-11-01/ca72b5b4-4bf4-40d2-ad5d-1c6a698838ac/ascreenshot.jpeg?tl_px=237,0&br_px=1312,600&force_format=jpeg&q=100&wat_scale=95&wat=1&wat_opacity=0.7&wat_gravity=northwest&wat_url=https://colony-recorder.s3.us-west-1.amazonaws.com/images/watermarks/FB923C_standard.png&wat_pad=502,262"
                className="rounded-lg shadow-md mt-2 mx-auto"
                width="300"
                height="300"
              />
            </div>
            <div className="my-5">
              <p className="font-normal">
                2. Type the names with each name on a new line
              </p>
              <Image
                alt="how to use"
                src="https://ajeuwbhvhr.cloudimg.io/colony-recorder.s3.amazonaws.com/files/2024-11-01/c8beb088-5d81-41da-9eb2-f2683c931700/ascreenshot.jpeg?tl_px=371,154&br_px=1447,755&force_format=jpeg&q=100&wat_scale=95&wat=1&wat_opacity=0.7&wat_gravity=northwest&wat_url=https://colony-recorder.s3.us-west-1.amazonaws.com/images/watermarks/FB923C_standard.png&wat_pad=508,265"
                className="rounded-lg shadow-md mt-2 mx-auto"
                width="300"
                height="300"
              />
            </div>
            <div className="my-5">
              <p className="font-normal">
                3. Specify number of members with the &ldquo;size&ldquo; field
              </p>
              <Image
                alt="how to use"
                src="https://ajeuwbhvhr.cloudimg.io/colony-recorder.s3.amazonaws.com/files/2024-11-01/c8beb088-5d81-41da-9eb2-f2683c931700/ascreenshot.jpeg?tl_px=371,154&br_px=1447,755&force_format=jpeg&q=100&wat_scale=95&wat=1&wat_opacity=0.7&wat_gravity=northwest&wat_url=https://colony-recorder.s3.us-west-1.amazonaws.com/images/watermarks/FB923C_standard.png&wat_pad=508,265"
                className="rounded-lg shadow-md mt-2 mx-auto"
                width="300"
                height="300"
              />
            </div>
            <div className="my-5">
              <p className="font-normal">
                4. Click &ldquo;Generate Groups&ldquo;
              </p>
              <Image
                alt="how to use"
                src="https://ajeuwbhvhr.cloudimg.io/colony-recorder.s3.amazonaws.com/files/2024-11-01/22585db0-bd32-4338-9ac3-3428ebd56bbd/ascreenshot.jpeg?tl_px=259,251&br_px=1334,852&force_format=jpeg&q=100&wat_scale=95&wat=1&wat_opacity=0.7&wat_gravity=northwest&wat_url=https://colony-recorder.s3.us-west-1.amazonaws.com/images/watermarks/FB923C_standard.png&wat_pad=502,265"
                className="rounded-lg shadow-md mt-2 mx-auto"
                width="300"
                height="300"
              />
            </div>
            <div className="my-5">
              <p className="font-normal">5. Select the file type you prefer</p>
              <Image
                alt="how to use"
                src="https://ajeuwbhvhr.cloudimg.io/colony-recorder.s3.amazonaws.com/files/2024-11-01/a0e3dcde-4709-419d-b773-eb54bdb24d93/ascreenshot.jpeg?tl_px=277,177&br_px=1352,778&force_format=jpeg&q=100&wat_scale=95&wat=1&wat_opacity=0.7&wat_gravity=northwest&wat_url=https://colony-recorder.s3.us-west-1.amazonaws.com/images/watermarks/FB923C_standard.png&wat_pad=502,265"
                className="rounded-lg shadow-md mt-2 mx-auto"
                width="300"
                height="300"
              />
            </div>
            <div className="my-5">
              <p className="font-normal">6. Click on Download</p>
              <Image
                alt="how to use"
                src="https://ajeuwbhvhr.cloudimg.io/colony-recorder.s3.amazonaws.com/files/2024-11-01/44817c94-0da2-412a-b18d-0a3167133d32/ascreenshot.jpeg?tl_px=173,268&br_px=1248,869&force_format=jpeg&q=100&wat_scale=95&wat=1&wat_opacity=0.7&wat_gravity=northwest&wat_url=https://colony-recorder.s3.us-west-1.amazonaws.com/images/watermarks/FB923C_standard.png&wat_pad=502,315"
                className="rounded-lg shadow-md mt-2 mx-auto"
                width="300"
                height="300"
              />
            </div>
          </div>
        </dialog>
      </>
    );
}

export default Help;